/**
 * Session Routes - Training session management endpoints
 */

import express from 'express';
import { sessionManager, SessionState } from '../services/sessionManager';
import { createAgent } from '../agents/baseAgent';
import { logger } from '../config/logger';
import { validateAgentResponse } from '../middleware/guardrails';

const router = express.Router();

/**
 * POST /api/session
 * Start a new training session
 */
router.post('/', async (req, res) => {
  try {
    const { lessonCode, exerciseCode, mode = 'exercise' } = req.body;

    if (!lessonCode && !exerciseCode) {
      return res.status(400).json({
        error: 'MISSING_CODE',
        message: 'Either lessonCode or exerciseCode is required'
      });
    }

    // Create session
    const session = await sessionManager.createSession({
      mode: lessonCode ? 'lesson' : 'exercise',
      exerciseCode,
      lessonCode
    });

    // Generate initial Navigator guidance if feedforward is enabled
    let initialGuidance = null;
    
    if (session.config.toggles.feedforward) {
      try {
        const navigatorAgent = createAgent('navigator');
        const context = {
          sessionId: session.id,
          protocols: session.protocols,
          conversationHistory: session.conversationHistory,
          exerciseConfig: {
            focusHint: session.config.focusHint,
            caseRole: 'Concerned Parent',
            caseBackground: 'A parent worried about their child\'s academic progress'
          }
        };

        const navigatorResponse = await navigatorAgent.generateInitialGuidance(context);
        initialGuidance = { navigator: navigatorResponse };

      } catch (error) {
        logger.error('Failed to generate initial Navigator guidance', {
          sessionId: session.id,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue without initial guidance rather than failing session creation
      }
    }

    res.json({
      session: {
        id: session.id,
        mode: session.mode,
        config: session.config,
        protocols: session.protocols,
        startedAt: session.metadata.startedAt
      },
      initialGuidance
    });

  } catch (error) {
    logger.error('Session creation failed', {
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    });

    res.status(500).json({
      error: 'SESSION_CREATION_FAILED',
      message: 'Failed to create training session'
    });
  }
});

/**
 * POST /api/session/:id/input
 * Send student input and get agent feedback
 */
router.post('/:id/input', validateAgentResponse('analyst'), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { content, timestamp } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Content is required and must be a non-empty string'
      });
    }

    // Get session
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Training session not found or expired'
      });
    }

    // Add user message to session
    const userMessage = await sessionManager.addMessage(sessionId, {
      role: 'user',
      content: content.trim(),
      metadata: { inputTimestamp: timestamp }
    });

    if (!userMessage) {
      return res.status(500).json({
        error: 'MESSAGE_STORAGE_FAILED',
        message: 'Failed to store user message'
      });
    }

    // Prepare agent context
    logger.info('Session input toggles', {
      sessionId,
      toggles: session.config.toggles
    });

    const agentContext = {
      sessionId,
      protocols: session.protocols,
      conversationHistory: session.conversationHistory,
      exerciseConfig: {
        focusHint: session.config.focusHint,
        caseRole: 'Concerned Parent',
        caseBackground: 'A parent concerned about their child\'s progress and well-being'
      }
    };

    // Generate agent responses in parallel
    const agentPromises: Array<Promise<any>> = [];
    const agentFeedback: any = {};

    // Analyst feedback (if enabled)
    if (session.config.toggles.iterative) {
      logger.info('Invoking AnalystAgent for iterative feedback', { sessionId });
      agentPromises.push(
        createAgent('analyst')
          .generateResponse(agentContext, content)
          .then(response => {
            logger.info('AnalystAgent produced response (pre-middleware)', {
              sessionId,
              hasRubric: Array.isArray((response as any)?.rubric),
              responseType: (response as any)?.type
            });
            agentFeedback.analyst = response;
          })
          .catch(error => {
            const raw = (error as any)?.rawResponse ? JSON.stringify((error as any).rawResponse) : undefined;
            logger.error('Analyst agent failed', {
              sessionId,
              error: error instanceof Error ? error.message : String(error),
              raw
            });
            agentFeedback.analyst = {
              error: `Analyst failed: ${error instanceof Error ? error.message : String(error)}`,
              raw
            };
          })
      );
    } else {
      logger.info('Skipping AnalystAgent: iterative toggle disabled', { sessionId });
    }

    // Navigator guidance (if enabled)
    if (session.config.toggles.feedforward) {
      logger.info('Invoking NavigatorAgent for feedforward guidance', { sessionId });
      agentPromises.push(
        createAgent('navigator')
          .generateMidConversationGuidance(agentContext, {
            turnCount: session.conversationHistory.filter(m => m.role === 'user').length,
            lastAnalystScores: agentFeedback.analyst?.rubric
          })
          .then(response => {
            logger.info('NavigatorAgent produced response (pre-middleware)', {
              sessionId,
              responseType: (response as any)?.type
            });
            agentFeedback.navigator = response;
          })
          .catch(error => {
            const raw = (error as any)?.rawResponse ? JSON.stringify((error as any).rawResponse) : undefined;
            logger.error('Navigator agent failed', {
              sessionId,
              error: error instanceof Error ? error.message : String(error),
              raw
            });
            agentFeedback.navigator = {
              error: `Navigator failed: ${error instanceof Error ? error.message : String(error)}`,
              raw
            };
          })
      );
    } else {
      logger.info('Skipping NavigatorAgent: feedforward toggle disabled', { sessionId });
    }


    // Wait for all agent responses
    await Promise.all(agentPromises);

    // Log complete agent feedback for debugging
    logger.debug('Complete agent feedback', {
      sessionId,
      agentFeedback: JSON.stringify(agentFeedback, null, 2),
      feedbackKeys: Object.keys(agentFeedback),
      hasErrors: Object.values(agentFeedback).some(f => f && typeof f === 'object' && 'error' in f)
    });

    // Generate AI roleplay response (mock for now)
    const aiResponse = await generateAIRoleplayResponse(content, agentContext);
    
    // Add AI response to session
    if (aiResponse) {
      await sessionManager.addMessage(sessionId, {
        role: 'assistant',
        content: aiResponse,
        metadata: { generated: true }
      });
    }

    // Update session state
    const updatedSession = await sessionManager.getSession(sessionId);

    // Prepare response payload
    const responsePayload: any = {
      session: {
        id: updatedSession!.id,
        messageCount: updatedSession!.conversationHistory.length,
        lastActivity: updatedSession!.metadata.lastActivityAt
      },
      aiResponse
    };

    // In development mode, expose full agent feedback for debugging
    // In production, only include validated/successful agent outputs
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.agentFeedback = agentFeedback;
      logger.debug('Development mode: exposing full agent feedback', {
        sessionId,
        feedbackKeys: Object.keys(agentFeedback),
        hasErrors: Object.values(agentFeedback).some(f => f && typeof f === 'object' && 'error' in f)
      });
    } else {
      // Production: only include successful agent responses
      const cleanFeedback: any = {};
      Object.entries(agentFeedback).forEach(([agentType, feedback]) => {
        if (feedback && typeof feedback === 'object' && !('error' in feedback)) {
          cleanFeedback[agentType] = feedback;
        }
      });
      if (Object.keys(cleanFeedback).length > 0) {
        responsePayload.agentFeedback = cleanFeedback;
      }
    }

    res.json(responsePayload);

  } catch (error) {
    logger.error('Session input processing failed', {
      sessionId: req.params.id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'INPUT_PROCESSING_FAILED',
      message: 'Failed to process session input'
    });
  }
});

/**
 * GET /api/session/:id
 * Get session state
 */
router.get('/:id', async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Session not found or expired'
      });
    }

    res.json({
      session: {
        id: session.id,
        mode: session.mode,
        config: session.config,
        protocols: session.protocols,
        messageCount: session.conversationHistory.length,
        startedAt: session.metadata.startedAt,
        lastActivity: session.metadata.lastActivityAt
      }
    });

  } catch (error) {
    logger.error('Session retrieval failed', {
      sessionId: req.params.id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'SESSION_RETRIEVAL_FAILED',
      message: 'Failed to retrieve session'
    });
  }
});

/**
 * DELETE /api/session/:id
 * End session
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    
    const ended = await sessionManager.endSession(sessionId);
    
    if (!ended) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      });
    }

    res.json({
      message: 'Session ended successfully',
      sessionId
    });

  } catch (error) {
    logger.error('Session termination failed', {
      sessionId: req.params.id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'SESSION_TERMINATION_FAILED',
      message: 'Failed to end session'
    });
  }
});

/**
 * Generate AI roleplay response (mock implementation)
 */
async function generateAIRoleplayResponse(
  userInput: string, 
  context: any
): Promise<string> {
  // Mock responses based on input patterns
  const responses = [
    "I appreciate you taking the time to listen to my concerns. Can you help me understand what resources are available to support my child?",
    "That's reassuring to hear. I'm wondering what I can do at home to help reinforce what they're learning in school?",
    "I'm still worried about the situation. Could you walk me through what the next steps would look like?",
    "Thank you for explaining that. I want to make sure I'm being supportive in the right way. What should I watch for?"
  ];

  // Simple pattern matching for demo
  if (userInput.toLowerCase().includes('understand')) {
    return responses[0];
  } else if (userInput.toLowerCase().includes('help') || userInput.toLowerCase().includes('support')) {
    return responses[1];
  } else if (userInput.toLowerCase().includes('concern') || userInput.toLowerCase().includes('worry')) {
    return responses[2];
  } else {
    return responses[3];
  }
}

export { router as sessionRoutes };