/**
 * BASIS Training Platform - Backend Server
 * Express server with OpenAI Agents integration for conversation training
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { validateApiKey } from './middleware/validateApiKey';
import { sessionRoutes } from './routes/session';
import { transcriptRoutes } from './routes/transcript';
import { healthRoutes } from './routes/health';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check (no API key required)
app.use('/api/health', healthRoutes);

// API key validation for protected routes
app.use('/api', validateApiKey);

// Routes
app.use('/api/session', sessionRoutes);
app.use('/api/transcript', transcriptRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BASIS Training Platform API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      session: '/api/session',
      transcript: '/api/transcript'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'ENDPOINT_NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/session',
      'POST /api/session/:id/input',
      'POST /api/transcript/review'
    ]
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`BASIS Training Platform API started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default app;