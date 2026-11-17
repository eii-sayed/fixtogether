const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { isOriginAllowed } = require('./utils/cors');
const { setSocketIO } = require('./services/notificationService');
const { startOutboxWorker, stopOutboxWorker } = require('./services/outboxService');
const { startSuspensionExpiryWorker, stopSuspensionExpiryWorker } = require('./services/moderationService');
const { startReviewQueueSyncWorker, stopReviewQueueSyncWorker } = require('./services/reviewQueueService');

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // Setup Socket.IO
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by Socket.IO CORS`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Register Socket.IO globally and with notification service
  global.io = io;
  setSocketIO(io);

  // Start background outbox processor
  startOutboxWorker(5000);
  startSuspensionExpiryWorker(60_000);
  startReviewQueueSyncWorker(120_000);

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      logger.debug(`Socket auth failed: ${err.message}`);
      return next(new Error('Invalid or expired token'));
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Automatically join user's notification room using verified identity
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.debug(`User ${socket.userId} joined notification room`);
    }

    socket.on('forum:join', (threadId) => {
      if (threadId) socket.join(`forum:${threadId}`);
    });

    socket.on('forum:leave', (threadId) => {
      if (threadId) socket.leave(`forum:${threadId}`);
    });

    // Join a repair-request-specific chat room with participant authorization
    socket.on('chat:join', async (repairRequestId) => {
      if (!repairRequestId || !socket.userId) return;

      try {
        const { RepairRequest } = require('./models');
        const { isParticipant } = require('./controllers/messageController');

        const repairRequest = await RepairRequest.findById(repairRequestId)
          .select('owner selectedTechnicians selectedQuotation requestStatus')
          .lean();

        if (!repairRequest) {
          socket.emit('chat:error', { message: 'Repair request not found' });
          return;
        }

        const authorized = await isParticipant(socket.userId, socket.userRole, repairRequest);
        if (!authorized) {
          socket.emit('chat:error', { message: 'Unauthorized room access' });
          logger.warn(`Unauthorized socket room join attempt: user ${socket.userId} on ${repairRequestId}`);
          return;
        }

        // Messages, typing, and repair updates are delivered directly to the
        // authorized users' rooms. Do not create a shared request room: a
        // request can involve multiple technicians.
        logger.debug(`Socket ${socket.id} authorized for private chat: ${repairRequestId}`);
      } catch (err) {
        logger.error('Socket chat:join error:', err.message);
      }
    });

    // Kept for client compatibility. Private chat delivery has no shared room.
    socket.on('chat:leave', (repairRequestId) => {
      if (repairRequestId) {
        logger.debug(`Socket ${socket.id} left private chat: ${repairRequestId}`);
      }
    });

    // Typing indicator — verified identity relay to other participants in the room
    // Private, server-authorized typing delivery. A shared request room can
    // contain more than one technician and must never receive another pair's events.
    const relayTyping = async (repairRequestId, eventName) => {
      if (!repairRequestId || !socket.userId) return;

      try {
        const { RepairRequest, User } = require('./models');
        const { isParticipant, getRecipient } = require('./controllers/messageController');
        const repairRequest = await RepairRequest.findById(repairRequestId)
          .select('owner selectedTechnicians selectedQuotation requestStatus')
          .lean();
        if (!repairRequest || !await isParticipant(socket.userId, socket.userRole, repairRequest)) return;

        const recipientId = await getRecipient(socket.userId, repairRequest);
        if (!recipientId) return;

        const payload = { repairRequestId, userId: socket.userId };
        if (eventName === 'chat:typing') {
          const sender = await User.findById(socket.userId).select('fullName').lean();
          payload.fullName = sender?.fullName || 'User';
        }
        io.to(`user:${recipientId}`).emit(eventName, payload);
      } catch (err) {
        logger.error(`Socket ${eventName} error:`, err.message);
      }
    };

    socket.on('chat:typing', ({ repairRequestId }) => relayTyping(repairRequestId, 'chat:typing'));
    socket.on('chat:stop-typing', ({ repairRequestId }) => relayTyping(repairRequestId, 'chat:stop-typing'));

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Start server
  server.listen(config.port, () => {
    logger.info(`🚀 FixTogether server running on port ${config.port} [${config.env}]`);
    logger.info(`📊 API: http://localhost:${config.port}/api/v1`);
    logger.info(`🤖 AI Provider: ${config.ai.provider}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    stopOutboxWorker();
    stopSuspensionExpiryWorker();
    stopReviewQueueSyncWorker();
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
