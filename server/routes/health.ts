/**
 * Health Check Routes - System status and diagnostics
 */

import express from 'express';
import { sessionManager } from '../services/sessionManager';
import { logger } from '../config/logger';
import { checkSupabaseConnection } from '../services/supabaseClient';

const router = express.Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        server: 'ok',
        openai: process.env.OPENAI_API_KEY ? 'ok' : 'error',
        supabase: 'ok',
        sessions: 'ok'
      }
    };

    // Check Supabase connection
    try {
      const supabaseHealthy = await checkSupabaseConnection();
      health.services.supabase = supabaseHealthy ? 'ok' : 'error';
    } catch (error) {
      health.services.supabase = 'error';
      health.status = 'degraded';
    }

    // Check session manager
    try {
      const activeSessions = await sessionManager.getActiveSessions();
      health.services.sessions = 'ok';
    } catch (error) {
      health.services.sessions = 'error';
      health.status = 'degraded';
    }

    // Overall status
    const hasErrors = Object.values(health.services).some(status => status === 'error');
    if (hasErrors) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      status: 'down',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed system diagnostics
 */
router.get('/detailed', async (req, res) => {
  try {
    const [activeSessions, supabaseHealthy] = await Promise.all([
      sessionManager.getActiveSessions(),
      checkSupabaseConnection()
    ]);
    
    const health = {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        server: 'ok',
        openai: {
          status: process.env.OPENAI_API_KEY ? 'ok' : 'error',
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
        },
        supabase: {
          status: supabaseHealthy ? 'ok' : 'error',
          url: process.env.SUPABASE_URL ? 'configured' : 'missing'
        },
        sessions: {
          status: 'ok',
          active: activeSessions.count,
          details: activeSessions.sessions
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development'
      }
    };

    res.json(health);

  } catch (error) {
    logger.error('Detailed health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

/**
 * GET /api/health/sessions
 * Session-specific health information
 */
router.get('/sessions', async (req, res) => {
  try {
    const activeSessions = await sessionManager.getActiveSessions();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      sessions: {
        active: activeSessions.count,
        list: activeSessions.sessions.map(session => ({
          id: session.id,
          mode: session.mode,
          startedAt: session.startedAt,
          messageCount: session.messageCount,
          duration: new Date().getTime() - session.startedAt.getTime()
        }))
      }
    });

  } catch (error) {
    logger.error('Session health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Session health check failed'
    });
  }
});

export { router as healthRoutes };