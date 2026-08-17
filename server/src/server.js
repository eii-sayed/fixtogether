const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { setSocketIO } = require('./services/notificationService');

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // Setup Socket.IO
  const io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Register Socket.IO with notification service
  setSocketIO(io);

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

    // Legacy join handler — only allow joining own room
    socket.on('join', (userId) => {
      if (userId && userId === socket.userId) {
        socket.join(`user:${userId}`);
      }
    });

    // Join a repair-request-specific chat room
    socket.on('chat:join', (repairRequestId) => {
      if (repairRequestId) {
        socket.join(`chat:${repairRequestId}`);
        logger.debug(`Socket ${socket.id} joined chat room: ${repairRequestId}`);
      }
    });

    // Leave a chat room
    socket.on('chat:leave', (repairRequestId) => {
      if (repairRequestId) {
        socket.leave(`chat:${repairRequestId}`);
        logger.debug(`Socket ${socket.id} left chat room: ${repairRequestId}`);
      }
    });

    // Typing indicator — relay to other participants in the room
    socket.on('chat:typing', ({ repairRequestId, userId, fullName }) => {
      if (repairRequestId) {
        socket.to(`chat:${repairRequestId}`).emit('chat:typing', {
          repairRequestId,
          userId,
          fullName,
        });
      }
    });

    // Stop typing indicator
    socket.on('chat:stop-typing', ({ repairRequestId, userId }) => {
      if (repairRequestId) {
        socket.to(`chat:${repairRequestId}`).emit('chat:stop-typing', {
          repairRequestId,
          userId,
        });
      }
    });

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
