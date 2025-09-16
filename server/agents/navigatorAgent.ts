/**
 * Navigator Agent - Feedforward guidance and proactive direction
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { NavigatorResponse } from '../schemas/agentSchemas';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';

export class NavigatorAgent extends BaseAgent {
  constructor() {
    super('navigator');
  }

  /**
   * Generate feedforward guidance
   */
  async generateResponse(context: AgentContext, userInput?: string): Promise<NavigatorResponse> {
    logger.debug('NavigatorAgent.generateResponse starting', {
      sessionId: context.sessionId,
      agentType: this.agentType,
      hasUserInput: !!userInput,
      userInputLength: userInput?.length || 0,
      willCallOpenAI: true
    });

    // Enhanced context for Navigator with forward-looking focus
    const navigatorContext: AgentContext = {
      ...context,
      exerciseConfig: {
        ...context.exerciseConfig,
        caseRole: 'Concerned Parent',
        caseBackground: 'A parent is worried about their child\'s academic progress and emotional well-being. They want to understand what support is available and how they can help at home.'
      }
    };

    let response;
    let rawResponse;
    try {
      response = await super.generateResponse(navigatorContext, userInput);
      rawResponse = response; // Capture raw before transformations
      
      logger.debug('NavigatorAgent received response from OpenAI', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        responseType: (response as any)?.type,
        hasGuidance: !!(response as any)?.guidance,
        hasNextSteps: !!(response as any)?.next_steps
      });
    } catch (error) {
      logger.error('NavigatorAgent OpenAI call failed', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
    
    // Ensure response is properly typed
    if (response.type !== 'feedforward') {
      throw new Error('Navigator agent returned invalid response type');
    }

    return response as NavigatorResponse;
  }

  /**
   * Generate initial session guidance (before any user input)
   */
  async generateInitialGuidance(context: AgentContext): Promise<NavigatorResponse> {
    const enhancedContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: 'The student is about to begin their first interaction. Provide proactive guidance to help them start effectively.'
        }
      ]
    };

    return this.generateResponse(enhancedContext);
  }

  /**
   * Generate mid-conversation guidance
   */
  async generateMidConversationGuidance(
    context: AgentContext, 
    conversationState: {
      turnCount: number;
      lastAnalystScores?: Array<{ field: string; score: number }>;
    }
  ): Promise<NavigatorResponse> {
    logger.debug('NavigatorAgent.generateMidConversationGuidance starting', {
      sessionId: context.sessionId,
      agentType: this.agentType,
      turnCount: conversationState.turnCount,
      hasAnalystScores: !!conversationState.lastAnalystScores,
      willCallOpenAI: true
    });
    let guidancePrompt = `The student has completed ${conversationState.turnCount} interaction(s). Provide guidance for their next response.`;

    // Include analyst feedback context if available
    if (conversationState.lastAnalystScores) {
      const lowScoreAreas = conversationState.lastAnalystScores
        .filter(score => score.score < 3)
        .map(score => score.field);
      
      if (lowScoreAreas.length > 0) {
        guidancePrompt += ` Focus on improving: ${lowScoreAreas.join(', ')}.`;
      }
    }

    const enhancedContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: guidancePrompt
        }
      ]
    };

    return this.generateResponse(enhancedContext);
  }
}