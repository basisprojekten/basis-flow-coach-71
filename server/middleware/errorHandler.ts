/**
 * Error Handler Middleware - Centralized error handling
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface BasisError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}

export const errorHandler = (
  err: BasisError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default error properties
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || {};

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (err.message?.includes('API key')) {
    statusCode = 500;
    errorCode = 'API_CONFIGURATION_ERROR';
    message = 'Service configuration error';
    details = {}; // Don't expose API key details
  } else if (err.message?.includes('timeout')) {
    statusCode = 408;
    errorCode = 'REQUEST_TIMEOUT';
  } else if (err.message?.includes('rate limit')) {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
  }

  // Log error details
  logger.error('Request error', {
    statusCode,
    errorCode,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    details
  });

  // Send error response
  res.status(statusCode).json({
    error: errorCode,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details
    }),
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
};