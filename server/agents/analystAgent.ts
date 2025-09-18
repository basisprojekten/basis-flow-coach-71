/**
 * Analyst Agent - Iterative feedback and retrospective analysis
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { AnalystResponse } from '../schemas/agentSchemas';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import { getAnalystPrompt } from '../prompts/analyst';

export class AnalystAgent extends BaseAgent {
  constructor() {
    super('analyst');
  }

  /**
   * Generate iterative feedback for student response
   */
  async generateResponse(context: AgentContext, userInput: string): Promise<AnalystResponse> {
    logger.debug('AnalystAgent.generateResponse starting', {
      sessionId: context.sessionId,
      agentType: this.agentType,
      hasUserInput: !!userInput,
      userInputLength: userInput?.length || 0,
      willCallOpenAI: true
    });

    if (!userInput || userInput.trim().length === 0) {
      throw new Error('Analyst agent requires user input to analyze');
    }

    // Enhanced context for Analyst with custom prompt injection
    const analystPrompt = getAnalystPrompt(context.exerciseConfig);
    
    const analystContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'user',
          content: userInput
        },
        {
          role: 'system', 
          content: analystPrompt
        }
      ]
    };

    let response;
    let rawResponse;
    try {
      response = await super.generateResponse(analystContext);
      rawResponse = response; // Capture raw before transformations
      
      logger.debug('AnalystAgent received response from OpenAI', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        responseType: (response as any)?.type,
        hasRubric: !!(response as any)?.rubric,
        hasFeedback: !!(response as any)?.past_only_feedback
      });
    } catch (error) {
      logger.error('AnalystAgent OpenAI call failed', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
    
    // Ensure response is properly typed and has segment ID
    if (response.type !== 'iterative_feedback') {
      throw new Error('Analyst agent returned invalid response type');
    }

    const analystResponse = response as AnalystResponse;
    
    // Ensure segment ID is properly formatted
    if (!analystResponse.segment_id.startsWith('seg_')) {
      analystResponse.segment_id = `seg_${nanoid(8)}`;
    }

    return analystResponse;
  }

  /**
   * Generate comparative analysis (compare current vs previous responses)
   */
  async generateComparativeAnalysis(
    context: AgentContext,
    currentInput: string,
    previousAnalysis?: AnalystResponse
  ): Promise<AnalystResponse> {
    
    let analysisPrompt = `Analyze the current student response: "${currentInput}"`;
    
    if (previousAnalysis) {
      const previousScores = previousAnalysis.rubric
        .map(r => `${r.field}: ${r.score}`)
        .join(', ');
      
      analysisPrompt += ` Compare improvement or decline from previous analysis (${previousScores}). Focus ONLY on changes observed in this specific response.`;
    }

    const enhancedContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'user',
          content: currentInput
        },
        {
          role: 'system',
          content: analysisPrompt
        }
      ]
    };

    return this.generateResponse(enhancedContext, currentInput);
  }

  /**
   * Generate quick assessment (for low-stakes interactions)
   */
  async generateQuickAssessment(
    context: AgentContext,
    userInput: string
  ): Promise<Pick<AnalystResponse, 'rubric' | 'past_only_feedback'>> {
    
    const fullResponse = await this.generateResponse(context, userInput);
    
    return {
      rubric: fullResponse.rubric,
      past_only_feedback: fullResponse.past_only_feedback
    };
  }
}