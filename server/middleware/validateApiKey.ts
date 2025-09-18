/**
 * API Key Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip validation in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.REQUIRE_API_KEY) {
    return next();
  }

  // Always allow unauthenticated access to upload healthcheck
  const pathLower = req.path.toLowerCase();
  if (pathLower === '/upload/health') {
    return next();
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OpenAI API key not configured');
    
    return res.status(500).json({
      error: 'API_CONFIGURATION_ERROR',
      message: 'OpenAI API key not configured. Please contact administrator.'
    });
  }

  // Validate API key length (OpenAI keys start with 'sk-' and are ~51 chars)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey.startsWith('sk-') || apiKey.length < 40) {
    logger.error('Invalid OpenAI API key format');
    
    return res.status(500).json({
      error: 'API_CONFIGURATION_ERROR',
      message: 'Invalid API key configuration. Please contact administrator.'
    });
  }

  next();
};