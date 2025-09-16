/**
 * Navigator Agent - Feedforward guidance and proactive direction
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { NavigatorResponse } from '../schemas/agentSchemas';
import { nanoid } from 'nanoid';

export class NavigatorAgent extends BaseAgent {
  constructor() {
    super('navigator');
  }

  /**
   * Generate feedforward guidance
   */
  async generateResponse(context: AgentContext, userInput?: string): Promise<NavigatorResponse> {
    // Enhanced context for Navigator with forward-looking focus
    const navigatorContext: AgentContext = {
      ...context,
      exerciseConfig: {
        ...context.exerciseConfig,
        caseRole: 'Concerned Parent',
        caseBackground: 'A parent is worried about their child\'s academic progress and emotional well-being. They want to understand what support is available and how they can help at home.'
      }
    };

    const response = await super.generateResponse(navigatorContext, userInput);
    
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