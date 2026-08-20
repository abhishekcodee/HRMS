import { Server as SocketIOServer } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { pool } from './database/index.js';
import { seedDatabase } from './database/seed.js';
import { setupChatSockets } from './modules/chat/chatSocket.js';

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 HRMS Backend API Server started on port ${env.PORT}`);
  logger.info(`📍 API Health Endpoint: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  logger.info(`📍 API Readiness Endpoint: http://localhost:${env.PORT}${env.API_PREFIX}/ready`);

  try {
    await seedDatabase();
  } catch (err) {
    logger.error('Auto seed database failed on server startup:', err);
  }
});

// Initialize Socket.IO Real-Time Chat Engine
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  },
});
setupChatSockets(io);
logger.info('⚡ Socket.IO Real-Time Engine attached to HRMS HTTP Server.');

// Graceful Shutdown Handling
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down HRMS backend server...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('PostgreSQL connection pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown database pool cleanup:', err);
      process.exit(1);
    }
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    logger.error('Forced shutdown timeout reached. Terminating process.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
