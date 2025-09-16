/**
 * Session Manager - In-memory session state management
 * Will be replaced with SQLite/Prisma persistence later
 */

import { nanoid } from 'nanoid';
import { logger } from '../config/logger';

export interface ConversationMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ExerciseConfig {
  id: string;
  title: string;
  caseId: string;
  toggles: {
    feedforward: boolean;
    iterative: boolean;
    mode: 'text' | 'voice' | 'transcript';
    skipRoleplayForGlobalFeedback?: boolean;
  };
  focusHint: string;
  protocols: string[];
}

export interface SessionState {
  id: string;
  exerciseId?: string;
  lessonId?: string;
  mode: 'exercise' | 'lesson' | 'transcript';
  currentExerciseIndex: number;
  conversationHistory: ConversationMessage[];
  protocols: string[]; // Active protocol IDs
  config: ExerciseConfig;
  metadata: {
    startedAt: Date;
    lastActivityAt: Date;
    studentId?: string;
    exerciseCode?: string;
    lessonCode?: string;
  };
}

class SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  private readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

  constructor() {
    // Cleanup expired sessions every 30 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000);
  }

  /**
   * Create a new training session
   */
  createSession(config: {
    mode: 'exercise' | 'lesson';
    exerciseCode?: string;
    lessonCode?: string;
  }): SessionState {
    const sessionId = nanoid(12);
    
    // Mock exercise configuration - replace with real data later
    const mockExercise: ExerciseConfig = {
      id: config.exerciseCode || config.lessonCode || 'demo-001',
      title: 'Confidentiality Discussion Training',
      caseId: 'concerned-parent-case',
      toggles: {
        feedforward: true,
        iterative: true,
        mode: 'text',
        skipRoleplayForGlobalFeedback: false
      },
      focusHint: 'Practice maintaining professional boundaries while showing empathy',
      protocols: ['basis-v1'] // Default to BASIS protocol
    };

    const session: SessionState = {
      id: sessionId,
      exerciseId: config.exerciseCode,
      lessonId: config.lessonCode,  
      mode: config.mode,
      currentExerciseIndex: 0,
      conversationHistory: [
        {
          id: nanoid(8),
          role: 'system',
          content: `Welcome to your BASIS training session. You will be practicing conversation techniques with a concerned parent role. The scenario: A parent is worried about their child's academic progress and wants to discuss intervention strategies.`,
          timestamp: new Date(),
          metadata: { type: 'session_start' }
        }
      ],
      protocols: mockExercise.protocols,
      config: mockExercise,
      metadata: {
        startedAt: new Date(),
        lastActivityAt: new Date(),
        exerciseCode: config.exerciseCode,
        lessonCode: config.lessonCode
      }
    };

    this.sessions.set(sessionId, session);
    
    logger.info('Session created', {
      sessionId,
      mode: config.mode,
      exerciseCode: config.exerciseCode,
      lessonCode: config.lessonCode
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - session.metadata.lastActivityAt.getTime();
    
    if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      logger.info('Session expired and removed', { sessionId });
      return null;
    }

    return session;
  }

  /**
   * Update session with new message
   */
  addMessage(sessionId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const newMessage: ConversationMessage = {
      id: nanoid(8),
      timestamp: new Date(),
      ...message
    };

    session.conversationHistory.push(newMessage);
    session.metadata.lastActivityAt = new Date();

    logger.debug('Message added to session', {
      sessionId,
      messageId: newMessage.id,
      role: newMessage.role,
      contentLength: newMessage.content.length
    });

    return newMessage;
  }

  /**
   * Update session metadata
   */
  updateSession(sessionId: string, updates: Partial<Pick<SessionState, 'currentExerciseIndex' | 'protocols'>>): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    Object.assign(session, updates);
    session.metadata.lastActivityAt = new Date();

    return true;
  }

  /**
   * End session and clean up
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    
    logger.info('Session ended', {
      sessionId,
      duration: new Date().getTime() - session.metadata.startedAt.getTime(),
      messageCount: session.conversationHistory.length
    });

    return true;
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getActiveSessions(): { count: number; sessions: Array<{ id: string; mode: string; startedAt: Date; messageCount: number }> } {
    const sessions = Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      mode: session.mode,
      startedAt: session.metadata.startedAt,
      messageCount: session.conversationHistory.length
    }));

    return {
      count: sessions.length,
      sessions
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.metadata.lastActivityAt.getTime();
      
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }
}

export const sessionManager = new SessionManager();