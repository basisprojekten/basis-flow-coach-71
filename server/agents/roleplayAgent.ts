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
   * Build system prompt for roleplay, prioritizing instruction content
   */
  private buildRoleplaySystemPrompt(context: AgentContext, userInput: string): string {
    const meta = context.exerciseConfig?.meta ?? {};
    const instructionContent = meta.instructionContent?.trim();

    const defaultPrimaryInstruction =
      `Inga specifika lärarinstruktioner angavs. Anta standarduppdraget: gestalta ${context.exerciseConfig?.caseRole || 'en orolig förälder'} som söker stöd kring sitt barns välmående och fortsätt att reagera autentiskt på studentens senaste yttrande.`;

    const promptSections: string[] = [];
    const primaryInstruction = instructionContent && instructionContent.length > 0
      ? instructionContent
      : defaultPrimaryInstruction;

    promptSections.push(`PRIMÄR INSTRUKTION (STYRANDE):\n${primaryInstruction}`);

    const backgroundSections: string[] = [];

    backgroundSections.push(
      [
        'STANDARDREFERENS FÖR ROLLSPELSAGENTEN:',
        '- Håll dig strikt i karaktär och svara på svenska.',
        '- Spegla karaktärens känsloläge och motivationer.',
        '- Svara kort och naturligt (1-3 meningar) för att stödja studentens träning.'
      ].join('\n')
    );

    const caseDetails: string[] = [];
    if (meta.caseContent) {
      caseDetails.push(`Karaktärsbeskrivning:\n${meta.caseContent}`);
    }
    if (context.exerciseConfig?.caseRole) {
      caseDetails.push(`Roll: ${context.exerciseConfig.caseRole}`);
    }
    if (context.exerciseConfig?.caseBackground) {
      caseDetails.push(`Scenario: ${context.exerciseConfig.caseBackground}`);
    }
    if (caseDetails.length > 0) {
      backgroundSections.push(`CASEKONTEKST:\n${caseDetails.join('\n')}`);
    }

    if (meta.protocolContent) {
      backgroundSections.push(
        `TRÄNINGSFOKUS (SEKUNDÄR):\n${meta.protocolContent}\n\nDetta är bakgrundsmaterial. Låt den primära instruktionen styra hur du agerar.`
      );
    }

    backgroundSections.push(
      `AKTUELLT STUDENTUTTALANDE (KONTEXT):\n"${userInput}"\n\nBesvara detta yttrande enligt den primära instruktionen och i linje med bakgrundsmaterialet.`
    );

    if (backgroundSections.length > 0) {
      promptSections.push(
        `SEKUNDÄR KONTEXT OCH REFERENSMATERIAL:\n${backgroundSections.join('\n\n')}\n\nBakgrundsmaterialet finns för att stödja den primära instruktionen.`
      );
    }

    return promptSections.join('\n\n').trim();
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