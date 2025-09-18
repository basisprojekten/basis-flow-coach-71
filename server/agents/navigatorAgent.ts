/**
 * Navigator Agent - Feedforward guidance and proactive direction
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { NavigatorResponse } from '../schemas/agentSchemas';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import { getNavigatorPrompt } from '../prompts/navigator';

export class NavigatorAgent extends BaseAgent {
  constructor() {
    super('navigator');
  }

  /**
   * Generate feedforward guidance with adaptive focus based on exercise type
   */
  async generateResponse(context: AgentContext, userInput?: string): Promise<NavigatorResponse> {
    logger.debug('NavigatorAgent.generateResponse starting', {
      sessionId: context.sessionId,
      agentType: this.agentType,
      hasUserInput: !!userInput,
      userInputLength: userInput?.length || 0,
      protocolsCount: context.protocols?.length || 0,
      willCallOpenAI: true
    });

    // Enhanced context for Navigator with custom prompt injection
    const navigatorPrompt = getNavigatorPrompt(context.exerciseConfig);
    
    const navigatorContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: navigatorPrompt
        }
      ]
    };

    let response;
    try {
      response = await super.generateResponse(navigatorContext, userInput);
      
      logger.debug('NavigatorAgent received response from OpenAI', {
        sessionId: context.sessionId,
        agentType: this.agentType,
        responseType: (response as any)?.type,
        hasNextFocus: !!(response as any)?.next_focus,
        hasMicroObjective: !!(response as any)?.micro_objective
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
   * Generate initial session guidance (briefing before exercise starts)
   */
  async generateInitialGuidance(context: AgentContext): Promise<NavigatorResponse> {
    const protocols = context.protocols || [];
    const exerciseConfig = context.exerciseConfig;
    
    // Create introduction briefing prompt
    const briefingPrompt = `UPPDRAG: Ge en kort inledande briefing till studenten innan övningen börjar.

CASE-SCENARIO: ${exerciseConfig?.caseBackground || 'Övningssituation'}
STUDENTENS ROLL: ${exerciseConfig?.caseRole || 'Samtalsledare'}

Skapa en välkomnande och tydlig briefing som:
1. Förklarar vad studenten ska träna på i denna övning
2. Sätter förväntningar utan att avslöja svar
3. Ger känsla av trygghet och stöd
4. Motiverar varför denna träning är värdefull

Använd formatet: "I den här övningen kommer du särskilt träna på..." och fortsätt med konkret, uppmuntrande vägledning.`;

    const enhancedContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: briefingPrompt
        }
      ]
    };

    return this.generateResponse(enhancedContext);
  }

  /**
   * Generate mid-conversation guidance with coaching approach
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

    // Build coaching guidance prompt
    let guidancePrompt = `LÖPANDE COACHING: Studenten har genomfört ${conversationState.turnCount} interaktion(er). 

Ge 1-2 meningar med feedforward-ledtrådar som:
- Hjälper studenten styra mot rätt protokolldel
- Håller fokus på case-situationen
- Uppmuntrar utan att ge facit
- Stöttar studentens egen upptäcktprocess`;

    // Include subtle direction based on analyst feedback
    if (conversationState.lastAnalystScores) {
      const lowScoreAreas = conversationState.lastAnalystScores
        .filter(score => score.score < 2)
        .map(score => score.field);
      
      if (lowScoreAreas.length > 0) {
        guidancePrompt += `

SUBTIL STYRNING: Utan att nämna specifika brister, guida försiktigt mot förbättringar inom: ${lowScoreAreas.join(', ')}.
Använd positiv språkföring som "Kom ihåg att..." eller "Nästa steg kan vara att utforska..."`;
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