/**
 * Session Manager - Supabase-backed session state management
 * Replaces in-memory storage with persistent Supabase database
 */

import { nanoid } from 'nanoid';
import { logger } from '../config/logger';
import { supabase } from './supabaseClient';

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
  async createSession(config: {
    mode: 'exercise' | 'lesson';
    exerciseCode?: string;
    lessonCode?: string;
  }): Promise<SessionState> {
    const sessionId = nanoid(12);
    
    // Get exercise configuration from database
    let exerciseConfig: ExerciseConfig;
    
    if (config.exerciseCode) {
      const { data: exercise, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', config.exerciseCode)
        .single();
        
      if (error || !exercise) {
        logger.error('Exercise not found', { exerciseCode: config.exerciseCode, error });
        throw new Error(`Exercise not found: ${config.exerciseCode}`);
      }
      
      exerciseConfig = {
        id: exercise.id,
        title: exercise.title,
        caseId: exercise.case_id,
        toggles: exercise.toggles as any,
        focusHint: exercise.focus_hint || '',
        protocols: exercise.protocols as string[]
      };
    } else {
      // Default exercise configuration
      exerciseConfig = {
        id: 'demo-001',
        title: 'Confidentiality Discussion Training',
        caseId: 'concerned-parent-case',
        toggles: {
          feedforward: true,
          iterative: true,
          mode: 'text',
          skipRoleplayForGlobalFeedback: false
        },
        focusHint: 'Practice maintaining professional boundaries while showing empathy',
        protocols: ['basis-v1']
      };
    }

    const initialMessage: ConversationMessage = {
      id: nanoid(8),
      role: 'system',
      content: `Welcome to your BASIS training session. You will be practicing conversation techniques with a concerned parent role. The scenario: A parent is worried about their child's academic progress and wants to discuss intervention strategies.`,
      timestamp: new Date(),
      metadata: { type: 'session_start' }
    };

    const sessionState = {
      conversationHistory: [initialMessage],
      currentExerciseIndex: 0,
      protocols: exerciseConfig.protocols,
      config: exerciseConfig
    };

    // Insert session into database
    const { data: dbSession, error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        mode: config.mode,
        exercise_id: config.exerciseCode,
        lesson_id: config.lessonCode,
        state: sessionState,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !dbSession) {
      logger.error('Failed to create session in database', { error });
      throw new Error('Failed to create session');
    }

    const session: SessionState = {
      id: sessionId,
      exerciseId: config.exerciseCode,
      lessonId: config.lessonCode,
      mode: config.mode,
      currentExerciseIndex: sessionState.currentExerciseIndex,
      conversationHistory: sessionState.conversationHistory,
      protocols: sessionState.protocols,
      config: exerciseConfig,
      metadata: {
        startedAt: new Date(dbSession.started_at),
        lastActivityAt: new Date(dbSession.last_activity_at),
        exerciseCode: config.exerciseCode,
        lessonCode: config.lessonCode
      }
    };
    
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
  async getSession(sessionId: string): Promise<SessionState | null> {
    const { data: dbSession, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !dbSession) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - new Date(dbSession.last_activity_at).getTime();
    
    if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
      await this.endSession(sessionId);
      logger.info('Session expired and removed', { sessionId });
      return null;
    }

    const state = dbSession.state as any;
    
    const session: SessionState = {
      id: dbSession.id,
      exerciseId: dbSession.exercise_id,
      lessonId: dbSession.lesson_id,
      mode: dbSession.mode as 'exercise' | 'lesson' | 'transcript',
      currentExerciseIndex: state.currentExerciseIndex || 0,
      conversationHistory: state.conversationHistory || [],
      protocols: state.protocols || ['basis-v1'],
      config: state.config || {
        id: 'demo-001',
        title: 'Default Exercise',
        caseId: 'concerned-parent-case',
        toggles: { feedforward: true, iterative: true, mode: 'text' },
        focusHint: '',
        protocols: ['basis-v1']
      },
      metadata: {
        startedAt: new Date(dbSession.started_at),
        lastActivityAt: new Date(dbSession.last_activity_at),
        exerciseCode: dbSession.exercise_id,
        lessonCode: dbSession.lesson_id
      }
    };

    return session;
  }

  /**
   * Update session with new message
   */
  async addMessage(sessionId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<ConversationMessage | null> {
    const session = await this.getSession(sessionId);
    
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

    // Update session state in database
    const updatedState = {
      conversationHistory: session.conversationHistory,
      currentExerciseIndex: session.currentExerciseIndex,
      protocols: session.protocols,
      config: session.config
    };

    const { error } = await supabase
      .from('sessions')
      .update({
        state: updatedState,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      logger.error('Failed to update session state', { sessionId, error });
      return null;
    }

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
  async updateSession(sessionId: string, updates: Partial<Pick<SessionState, 'currentExerciseIndex' | 'protocols'>>): Promise<boolean> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    Object.assign(session, updates);
    session.metadata.lastActivityAt = new Date();

    // Update session state in database
    const updatedState = {
      conversationHistory: session.conversationHistory,
      currentExerciseIndex: session.currentExerciseIndex,
      protocols: session.protocols,
      config: session.config
    };

    const { error } = await supabase
      .from('sessions')
      .update({
        state: updatedState,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      logger.error('Failed to update session metadata', { sessionId, error });
      return false;
    }

    return true;
  }

  /**
   * End session and clean up
   */
  async endSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    // Mark session as ended in database (we could add an 'ended_at' field or delete it)
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      logger.error('Failed to delete session', { sessionId, error });
      return false;
    }
    
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
  async getActiveSessions(): Promise<{ count: number; sessions: Array<{ id: string; mode: string; startedAt: Date; messageCount: number }> }> {
    const { data: dbSessions, error } = await supabase
      .from('sessions')
      .select('id, mode, started_at, state');

    if (error) {
      logger.error('Failed to get active sessions', { error });
      return { count: 0, sessions: [] };
    }

    const sessions = (dbSessions || []).map(session => ({
      id: session.id,
      mode: session.mode,
      startedAt: new Date(session.started_at),
      messageCount: (session.state as any)?.conversationHistory?.length || 0
    }));

    return {
      count: sessions.length,
      sessions
    };
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.SESSION_TIMEOUT);
    
    const { error, count } = await supabase
      .from('sessions')
      .delete()
      .lt('last_activity_at', cutoffTime.toISOString());

    if (error) {
      logger.error('Failed to cleanup expired sessions', { error });
      return;
    }

    if (count && count > 0) {
      logger.info(`Cleaned up ${count} expired sessions`);
    }
  }
}

export const sessionManager = new SessionManager();