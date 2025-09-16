/**
 * Reviewer Agent - Holistic feedback and comprehensive analysis
 */

import { BaseAgent, AgentContext } from './baseAgent';
import { ReviewerResponse } from '../schemas/agentSchemas';

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super('reviewer');
  }

  /**
   * Generate holistic feedback for complete transcript
   */
  async analyzeTranscript(
    protocols: string[],
    transcript: string,
    exerciseConfig?: {
      focusHint: string;
      title: string;
    }
  ): Promise<ReviewerResponse> {
    
    // Parse transcript into conversation turns
    const conversationHistory = this.parseTranscript(transcript);
    
    const context: AgentContext = {
      sessionId: 'transcript_analysis',
      protocols,
      conversationHistory,
      exerciseConfig: {
        focusHint: exerciseConfig?.focusHint || 'Comprehensive conversation analysis',
        caseRole: 'Various roles',
        caseBackground: 'Complete conversation transcript analysis'
      }
    };

    const response = await super.generateResponse(context);
    
    // Ensure response is properly typed
    if (response.type !== 'holistic_feedback') {
      throw new Error('Reviewer agent returned invalid response type');
    }

    return response as ReviewerResponse;
  }

  /**
   * Generate session summary (for completed training sessions)
   */
  async generateSessionSummary(context: AgentContext): Promise<ReviewerResponse> {
    
    const enhancedContext: AgentContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'system',
          content: 'Provide a comprehensive summary of the entire training session. Focus on overall patterns, growth demonstrated, and key development areas across all interactions.'
        }
      ]
    };

    const response = await super.generateResponse(enhancedContext);
    
    if (response.type !== 'holistic_feedback') {
      throw new Error('Reviewer agent returned invalid response type');
    }

    return response as ReviewerResponse;
  }

  /**
   * Generate comparative assessment (multiple sessions)
   */
  async generateComparativeAssessment(
    currentSession: AgentContext,
    previousSessions: Array<{
      date: Date;
      rubricSummary: Array<{ field: string; score: number }>;
      keyInsights: string[];
    }>
  ): Promise<ReviewerResponse> {
    
    const progressContext = previousSessions.map(session => 
      `Session ${session.date.toISOString().split('T')[0]}: ${
        session.rubricSummary.map(r => `${r.field}:${r.score}`).join(', ')
      }`
    ).join('\n');

    const enhancedContext: AgentContext = {
      ...currentSession,
      conversationHistory: [
        ...currentSession.conversationHistory,
        {
          role: 'system',
          content: `Analyze current session in context of previous performance:

PREVIOUS SESSIONS:
${progressContext}

Identify trends, improvements, and persistent challenges across sessions.`
        }
      ]
    };

    return this.generateSessionSummary(enhancedContext);
  }

  /**
   * Parse transcript text into conversation history
   */
  private parseTranscript(transcript: string): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const lines = transcript.split('\n').filter(line => line.trim());
    const history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system message
    history.push({
      role: 'system',
      content: 'Transcript analysis - reviewing complete conversation for holistic assessment.'
    });

    // Simple parsing - look for common patterns
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) continue;

      // Look for speaker indicators
      if (trimmed.toLowerCase().startsWith('student:') || 
          trimmed.toLowerCase().startsWith('trainee:') ||
          trimmed.toLowerCase().startsWith('you:')) {
        history.push({
          role: 'user',
          content: trimmed.replace(/^(student|trainee|you):\s*/i, '')
        });
      } else if (trimmed.toLowerCase().startsWith('parent:') ||
                 trimmed.toLowerCase().startsWith('client:') ||
                 trimmed.toLowerCase().startsWith('role:')) {
        history.push({
          role: 'assistant', 
          content: trimmed.replace(/^(parent|client|role):\s*/i, '')
        });
      } else {
        // Default to user if no clear indicator
        history.push({
          role: 'user',
          content: trimmed
        });
      }
    }

    return history;
  }
}