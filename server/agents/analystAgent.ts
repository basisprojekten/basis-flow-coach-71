/**
 * Analyst Agent - Iterative feedback and retrospective analysis
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { AnalystResponse } from '../schemas/agentSchemas';
import { nanoid } from 'nanoid';

export class AnalystAgent extends BaseAgent {
  constructor() {
    super('analyst');
  }

  /**
   * Generate iterative feedback for student response
   */
  async generateResponse(context: AgentContext, userInput: string): Promise<AnalystResponse> {
    if (!userInput || userInput.trim().length === 0) {
      throw new Error('Analyst agent requires user input to analyze');
    }

    // Enhanced context for Analyst with retrospective focus
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
          content: `Analyze the student's response: "${userInput}". Focus ONLY on what just happened. No future recommendations.`
        }
      ]
    };

    const response = await super.generateResponse(analystContext);
    
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