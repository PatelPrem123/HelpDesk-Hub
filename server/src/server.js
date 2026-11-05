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

// 5. Root Gateway Route - Landing for Browsers & API Clients
app.get('/', (req, res) => {
  if (req.accepts('html') && !req.xhr && (!req.headers.accept || !req.headers.accept.includes('application/json'))) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HelpDesk Hub - Backend API Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 36px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 16px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
    h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .note {
      background: #0f172a;
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 24px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      border-radius: 12px;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      transition: background 0.2s;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .btn:hover { background: #1d4ed8; }
    .links {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 16px;
      font-size: 12px;
    }
    .link-item {
      padding: 10px 12px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      display: block;
      transition: border-color 0.2s, color 0.2s;
    }
    .link-item:hover { border-color: #3b82f6; color: #60a5fa; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> Backend API Server Online (Port ${env.PORT})</div>
    <h1>HelpDesk Hub API Gateway</h1>
    <p>Yeh HelpDesk Hub ka backend server hai jo REST API aur WebSockets provide karta hai. Frontend user interface dekhne ke liye neeche diye gaye button par click karein.</p>
    
    <div class="note">
      💡 <strong>Web UI Address:</strong> <a href="${env.CLIENT_ORIGIN}" style="color: #60a5fa; text-decoration: underline;">${env.CLIENT_ORIGIN}</a>
    </div>

    <a href="${env.CLIENT_ORIGIN}" class="btn">
      👉 Open HelpDesk Hub Web App (Port 3000)
    </a>

    <div class="links">
      <a href="/api/v1/health" class="link-item">🏥 Health Diagnostics</a>
      <a href="${env.CLIENT_ORIGIN}/admin" class="link-item">⚙️ Admin Console</a>
    </div>

    <div class="footer">
      HelpDesk Hub Enterprise ITSM & SLA Management Platform &bull; v1.0.0
    </div>
  </div>
</body>
</html>`);
  }

  res.status(200).json({
    success: true,
    data: {
      service: 'HelpDesk Hub API Gateway',
      version: '1.0.0',
      status: 'UP',
      clientAppUrl: env.CLIENT_ORIGIN,
      healthEndpoint: '/api/v1/health'
    }
  });
});

// 6. System Health & Diagnostic Route
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
