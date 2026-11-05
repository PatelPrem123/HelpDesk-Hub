import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

let ioInstance = null;

export function initializeSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.cookie?.split(';')
                      .find(c => c.trim().startsWith('token='))?.split('=')[1];

      if (!token) {
        return next(new Error('Authentication required for WebSocket connection'));
      }

      const decoded = jwt.verify(decodeURIComponent(token), env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid WebSocket credentials'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`WebSocket client connected: ${user.id} (${user.role})`);

    // 1. Join personal private room
    socket.join(`user_${user.id}`);

    // 2. Join technician/admin broadcast pool
    if (user.role === ROLES.TECHNICIAN || user.role === ROLES.ADMINISTRATOR) {
      socket.join('role_technicians');
    }
    if (user.role === ROLES.ADMINISTRATOR) {
      socket.join('role_admin');
    }

    // 3. Join / Leave active ticket room
    socket.on('ticket:join', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket_${ticketId}`);
        logger.info(`User ${user.id} joined ticket room: ticket_${ticketId}`);
      }
    });

    socket.on('ticket:leave', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket_${ticketId}`);
        logger.info(`User ${user.id} left ticket room: ticket_${ticketId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${user.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}
