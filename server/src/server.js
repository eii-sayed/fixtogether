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

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join user-specific room for notifications
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        logger.debug(`User ${userId} joined notification room`);
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
