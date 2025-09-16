/**
 * Guardrails - Temporal Direction Enforcement for Agents
 * Blocks agents from violating their temporal constraints
 */

import { AgentType } from '../config/agents';
import { logger } from '../config/logger';

// Regex patterns for temporal direction violations
const NAVIGATOR_FORBIDDEN_PATTERNS = [
  /\b(nyligen|precis|nyss|du gjorde|tidigare svar|det som hände|i ditt förra)\b/gi,
  /\b(you just|previously|earlier|what happened|your last)\b/gi,
  /\b(analys av|feedback på|bedömning av) .*(replik|svar|yttrande)\b/gi
];

const ANALYST_FORBIDDEN_PATTERNS = [
  /\b(nästa gång|framöver|bör du nu|kommande steg|fortsätt med|nästa)\b/gi,
  /\b(next time|going forward|you should now|upcoming|continue to)\b/gi,
  /\b(i framtiden|kommande|planera för|förbered dig)\b/gi
];

const REVIEWER_FORBIDDEN_PATTERNS = [
  /\bsegment_id\b/gi,
  /\b(i replik|efter replik|denna specifika|just nu)\b/gi,
  /\b(this specific response|in this reply|right now)\b/gi
];

export interface GuardrailViolation {
  agentType: AgentType;
  violationType: 'temporal_direction' | 'schema_compliance';
  pattern: string;
  matches: string[];
  severity: 'error' | 'warning';
}

export class GuardrailValidator {
  
  /**
   * Validate agent response against temporal direction rules
   */
  validateTemporal(agentType: AgentType, responseText: string): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    
    let patterns: RegExp[] = [];
    
    switch (agentType) {
      case 'navigator':
        patterns = NAVIGATOR_FORBIDDEN_PATTERNS;
        break;
      case 'analyst':  
        patterns = ANALYST_FORBIDDEN_PATTERNS;
        break;
      case 'reviewer':
        patterns = REVIEWER_FORBIDDEN_PATTERNS;
        break;
    }

    for (const pattern of patterns) {
      const matches = responseText.match(pattern);
      if (matches && matches.length > 0) {
        violations.push({
          agentType,
          violationType: 'temporal_direction',
          pattern: pattern.source,
          matches: [...new Set(matches)], // Remove duplicates
          severity: 'error'
        });
      }
    }

    return violations;
  }

  /**
   * Check if response violates guardrails
   */
  hasViolations(agentType: AgentType, responseText: string): boolean {
    const violations = this.validateTemporal(agentType, responseText);
    return violations.length > 0;
  }

  /**
   * Get human-readable violation messages
   */
  getViolationMessages(violations: GuardrailViolation[]): string[] {
    return violations.map(v => {
      const agentName = v.agentType.charAt(0).toUpperCase() + v.agentType.slice(1);
      const matched = v.matches.join(', ');
      
      switch (v.agentType) {
        case 'navigator':
          return `${agentName} agent violated feedforward constraint by using retrospective language: "${matched}"`;
        case 'analyst':
          return `${agentName} agent violated retrospective constraint by using forward-looking language: "${matched}"`;
        case 'reviewer':
          return `${agentName} agent violated holistic constraint by using segment-specific language: "${matched}"`;
        default:
          return `${agentName} agent violated temporal constraint: "${matched}"`;
      }
    });
  }

  /**
   * Log violations for monitoring
   */
  logViolations(violations: GuardrailViolation[], sessionId?: string): void {
    for (const violation of violations) {
      logger.warn('Guardrail violation detected', {
        sessionId,
        agentType: violation.agentType,
        violationType: violation.violationType,
        pattern: violation.pattern,
        matches: violation.matches,
        severity: violation.severity,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const guardrailValidator = new GuardrailValidator();

/**
 * Middleware to validate agent responses before sending to client
 */
export const validateAgentResponse = (agentType: AgentType) => {
  return (req: any, res: any, next: any) => {
    // Store original json method
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Check if response contains agent output
      if (body && typeof body === 'object') {
        let responseText = '';
        
        // Extract text from common response patterns
        if (body.agentFeedback) {
          responseText = JSON.stringify(body.agentFeedback);
        } else if (body.analysis) {
          responseText = JSON.stringify(body.analysis);
        } else {
          responseText = JSON.stringify(body);
        }

        const violations = guardrailValidator.validateTemporal(agentType, responseText);
        
        if (violations.length > 0) {
          guardrailValidator.logViolations(violations, req.sessionId);
          
          // In development, log warnings but allow response
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Guardrail violations detected in development mode', {
              violations: guardrailValidator.getViolationMessages(violations)
            });
          } else {
            // In production, block response with violations
            return originalJson.call(this, {
              error: 'GUARDRAIL_VIOLATION',
              message: 'Agent response violated temporal constraints',
              violations: guardrailValidator.getViolationMessages(violations)
            });
          }
        }
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};