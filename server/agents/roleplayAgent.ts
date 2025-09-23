/**
 * Roleplay Agent - AI-powered conversational roleplay for training scenarios
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { logger } from '../config/logger';

export interface RoleplayResponse {
  type: 'roleplay';
  content: string;
  metadata?: {
    role: string;
    scenario: string;
    emotional_state?: string;
  };
}

export class RoleplayAgent extends BaseAgent {
  constructor() {
    super('roleplay');
  }

  /**
   * Generate contextual roleplay response as the parent/case character
   */
  async generateResponse(context: AgentContext, userInput: string): Promise<RoleplayResponse> {
    logger.debug('RoleplayAgent.generateResponse starting', {
      sessionId: context.sessionId,
      agentType: this.agentType,
      hasUserInput: !!userInput,
      userInputLength: userInput?.length || 0,
      willCallOpenAI: true
    });

    if (!userInput || userInput.trim().length === 0) {
      throw new Error('Roleplay agent requires user input to respond to');
    }

    // Enhanced context for roleplay with character background
    const roleplayContext: AgentContext = {
      ...context,
      exerciseConfig: {
        ...context.exerciseConfig,
        caseRole: 'Concerned Parent',
        caseBackground: 'A parent is worried about their child\'s academic progress and emotional well-being. They want to understand what support is available and how they can help at home.'
      },
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: this.buildRoleplaySystemPrompt(context, userInput)
        },
        {
          role: 'user',
          content: userInput
        }
      ]
    };

    let response;
    let rawResponse;
    try {
      // Call parent generateResponse which uses callOpenAI
      const aiResponse = await super.generateResponse(roleplayContext, userInput);
      rawResponse = aiResponse;
      
      // Extract content from AI response
      let content: string;
      if (typeof aiResponse === 'string') {
        content = aiResponse;
      } else if (aiResponse && typeof aiResponse === 'object') {
        content = (aiResponse as any).content || (aiResponse as any).message || JSON.stringify(aiResponse);
      } else {
        content = 'I appreciate you taking the time to discuss this with me.';
      }

      response = {
        type: 'roleplay' as const,
        content,
        metadata: {
          role: 'Concerned Parent',
          scenario: context.exerciseConfig?.caseBackground || 'Parent consultation',
          emotional_state: this.analyzeEmotionalState(userInput)
        }
      };
      
      logger.debug('RoleplayAgent received response from OpenAI', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        contentLength: content.length,
        hasMetadata: !!response.metadata
      });
    } catch (error) {
      logger.error('RoleplayAgent OpenAI call failed', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    return response;
  }

  /**
   * Build system prompt for roleplay, including instruction content if available
   */
  private buildRoleplaySystemPrompt(context: AgentContext, userInput: string): string {
    let prompt = '';
    
    // Inject instruction content at the top if available
    if (context.exerciseConfig?.meta?.instructionContent) {
      prompt += `ÖVERGRIPANDE INSTRUKTIONER:\n${context.exerciseConfig.meta.instructionContent}\n\n`;
    }
    
    prompt += `You are a concerned parent character in a training simulation. Stay in character as a worried but cooperative parent seeking help for your child. Respond naturally to: "${userInput}"`;
    
    return prompt;
  }

  /**
   * Analyze emotional state from user input to adjust parent character response
   */
  private analyzeEmotionalState(userInput: string): string {
    const input = userInput.toLowerCase();
    
    if (input.includes('understand') || input.includes('explain')) {
      return 'curious';
    } else if (input.includes('worry') || input.includes('concern')) {
      return 'anxious';
    } else if (input.includes('help') || input.includes('support')) {
      return 'hopeful';
    } else if (input.includes('good') || input.includes('positive')) {
      return 'relieved';
    } else {
      return 'engaged';
    }
  }

  /**
   * Generate initial greeting from parent character
   */
  async generateInitialGreeting(context: AgentContext): Promise<RoleplayResponse> {
    const greetingContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: 'Generate an opening statement as a concerned parent meeting with a school professional. Express your main worries about your child while being respectful.'
        }
      ]
    };

    return this.generateResponse(greetingContext, 'Hello, thank you for meeting with me today.');
  }
}