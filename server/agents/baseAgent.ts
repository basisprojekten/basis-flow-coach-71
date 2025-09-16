/**
 * Base Agent - Common functionality for all BASIS agents
 */

import OpenAI from 'openai';
import { logger } from '../config/logger';
import { guardrailValidator, GuardrailViolation } from '../middleware/guardrails';
import { AgentType, AGENT_CONFIGS } from '../config/agents';
import { AGENT_SCHEMAS, AgentResponse } from '../schemas/agentSchemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface AgentContext {
  sessionId: string;
  protocols: string[];
  conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  exerciseConfig: {
    focusHint: string;
    caseRole: string;
    caseBackground: string;
  };
}

export abstract class BaseAgent {
  protected agentType: AgentType;
  protected config: typeof AGENT_CONFIGS[AgentType];
  protected schema: typeof AGENT_SCHEMAS[AgentType];

  constructor(agentType: AgentType) {
    this.agentType = agentType;
    this.config = AGENT_CONFIGS[agentType];
    this.schema = AGENT_SCHEMAS[agentType];
  }

  /**
   * Generate response with retry logic and guardrail validation
   */
  async generateResponse(context: AgentContext, userInput?: string): Promise<AgentResponse> {
    let attempts = 0;
    const maxAttempts = this.config.maxRetries;
    let lastRawResponse: AgentResponse | undefined;

    while (attempts < maxAttempts) {
      try {
        attempts++;

        const response = await this.callOpenAI(context, userInput);
        // Debug: Log raw output BEFORE guardrails are applied
        try {
          logger.info(`Agent ${this.agentType} raw output before guardrails`, {
            sessionId: context.sessionId,
            raw: response
          });
        } catch (_) {
          // no-op logging safety
        }
        lastRawResponse = response;

        // Validate guardrails
        const responseText = JSON.stringify(response);
        const violations = guardrailValidator.validateTemporal(this.agentType, responseText);

        if (violations.length > 0) {
          guardrailValidator.logViolations(violations, context.sessionId);

          if (attempts >= maxAttempts) {
            const err: any = new Error(
              `Agent ${this.agentType} violated guardrails after ${maxAttempts} attempts: ${violations
                .map(v => v.matches.join(', '))
                .join('; ')}`
            );
            // Attach raw response for upstream handlers (frontend placeholders)
            err.rawResponse = lastRawResponse;
            throw err;
          }

          logger.warn(`Agent ${this.agentType} guardrail violation, retrying (attempt ${attempts}/${maxAttempts})`, {
            sessionId: context.sessionId,
            violations: violations.map(v => v.matches)
          });

          continue;
        }

        // Success - response passes guardrails
        logger.info(`Agent ${this.agentType} generated valid response`, {
          sessionId: context.sessionId,
          attempts,
          responseType: (response as any).type
        });

        return response;
      } catch (error) {
        logger.error(`Agent ${this.agentType} generation error (attempt ${attempts}/${maxAttempts})`, {
          sessionId: context.sessionId,
          error: error instanceof Error ? error.message : String(error),
          attempts
        });

        if (attempts >= maxAttempts) {
          const finalErr: any = new Error(
            `Agent ${this.agentType} failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`
          );
          // Attach last raw response if we had one
          if (lastRawResponse) finalErr.rawResponse = lastRawResponse;
          throw finalErr;
        }
      }
    }

    throw new Error(`Agent ${this.agentType} exhausted all retry attempts`);
  }

  /**
   * Call OpenAI with structured output
   */
  private async callOpenAI(context: AgentContext, userInput?: string): Promise<AgentResponse> {
    const messages = this.buildMessages(context, userInput);
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: `${this.agentType}_response`,
          schema: this.schema,
          strict: true
        }
      }
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    try {
      const response = JSON.parse(content);
      return response as AgentResponse;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build message array for OpenAI API
   */
  protected buildMessages(context: AgentContext, userInput?: string): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System prompt with protocol context
    const protocolContext = this.buildProtocolContext(context.protocols);
    const exerciseContext = this.buildExerciseContext(context.exerciseConfig);
    
    messages.push({
      role: 'system',
      content: `${this.config.systemPrompt}

PROTOKOLL-KONTEXT:
${protocolContext}

ÖVNINGS-KONTEXT:
${exerciseContext}

VIKTIGT: Svara ENDAST med valid JSON enligt schema. Inga extra kommentarer eller text utanför JSON.`
    });

    // Add conversation history (last N messages to stay within context window)
    const recentHistory = context.conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user input if provided
    if (userInput) {
      messages.push({
        role: 'user',
        content: userInput
      });
    }

    return messages;
  }

  /**
   * Build protocol context for agent
   */
  private buildProtocolContext(protocols: string[]): string {
    // Mock BASIS protocol - replace with real protocol loading
    const basisFields = [
      'Active Listening (0-4): Demonstrates attentive listening and understanding',
      'Empathy (0-4): Shows understanding and validation of emotions', 
      'Professionalism (0-4): Maintains appropriate boundaries and conduct',
      'Problem Resolution (0-4): Works towards constructive outcomes'
    ];

    return `Aktiva protokoll: ${protocols.join(', ')}

RUBRIC-FÄLT (BASIS):
${basisFields.map(field => `- ${field}`).join('\n')}

Använd EXAKT dessa fältnamn i dina rubric-bedömningar.`;
  }

  /**
   * Build exercise context for agent
   */
  private buildExerciseContext(config: AgentContext['exerciseConfig']): string {
    return `ÖVNINGSFOKUS: ${config.focusHint}

ROLLSPELS-SCENARIO:
- Roll: ${config.caseRole}
- Bakgrund: ${config.caseBackground}

Anpassa din feedback till denna specifika övningskontext.`;
  }

  /**
   * Get agent type
   */
  getType(): AgentType {
    return this.agentType;
  }
}

/**
 * Agent factory
 */
export function createAgent(agentType: AgentType): BaseAgent {
  switch (agentType) {
    case 'navigator':
      return new (require('./navigatorAgent').NavigatorAgent)();
    case 'analyst':
      return new (require('./analystAgent').AnalystAgent)();
    case 'reviewer':
      return new (require('./reviewerAgent').ReviewerAgent)();
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}