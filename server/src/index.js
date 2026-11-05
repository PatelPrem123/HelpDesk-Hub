import http from 'http';
import app from './server.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initializeSockets } from './sockets/index.js';
import { logger } from './utils/logger.js';

const httpServer = http.createServer(app);

// Initialize WebSockets
initializeSockets(httpServer);

// Start Server
async function startServer() {
  try {
    await connectDB();
    httpServer.listen(env.PORT, () => {
      logger.info(`HelpDesk Hub API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start application server', error);
    process.exit(1);
  }
}

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  httpServer.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (env.NODE_ENV !== 'test') {
  startServer();
}

export { httpServer, app };
