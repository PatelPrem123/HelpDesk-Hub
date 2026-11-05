import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import slaRoutes from './routes/slaRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

// 1. Security HTTP Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. CORS Policy
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body & Cookie Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// 4. Global API Throttling
app.use('/api/', apiLimiter);

// 5. System Health & Diagnostic Route
app.get('/api/v1/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      service: 'HelpDesk Hub API',
      version: '1.0.0',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// 6. Application Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/tickets/:ticketId/comments', commentRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/sla-policies', slaRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 6. 404 Handler for Undefined Endpoints
app.use((req, res, next) => {
  next(new AppError(`API endpoint not found: ${req.method} ${req.originalUrl}`, 404));
});

// 7. Centralized Error Handler
app.use(errorHandler);

export default app;
