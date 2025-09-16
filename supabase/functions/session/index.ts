// Supabase Edge Function: session
// Complete session management with action-based routing for Supabase Edge Functions

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status,
  });
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Session interfaces
interface ConversationMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ExerciseConfig {
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

interface SessionState {
  id: string;
  exerciseId?: string;
  lessonId?: string;
  mode: 'exercise' | 'lesson' | 'transcript';
  currentExerciseIndex: number;
  conversationHistory: ConversationMessage[];
  protocols: string[];
  config: ExerciseConfig;
  metadata: {
    startedAt: Date;
    lastActivityAt: Date;
    studentId?: string;
    exerciseCode?: string;
    lessonCode?: string;
  };
}

// Helper to generate random ID
function generateId(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Session management functions
async function createSession(config: {
  mode: 'exercise' | 'lesson';
  exerciseCode?: string;
  lessonCode?: string;
}): Promise<SessionState> {
  const sessionId = generateId(12);
  
  // Get exercise configuration from database
  let exerciseConfig: ExerciseConfig;
  // Get exercise configuration from database with safe fallback
  const demoExerciseConfig: ExerciseConfig = {
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
  
  if (config.exerciseCode) {
    console.log('Attempting to fetch exercise from Supabase', { exerciseCode: config.exerciseCode });
    try {
      const { data: exercise, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', config.exerciseCode)
        .maybeSingle();
      
      console.log('Exercise fetch result', { hasError: !!error, found: !!exercise });
      
      if (error || !exercise) {
        console.warn('Exercise not found or query error. Falling back to demo exercise.', {
          exerciseCode: config.exerciseCode,
          error: error?.message
        });
        exerciseConfig = demoExerciseConfig;
      } else {
        exerciseConfig = {
          id: exercise.id,
          title: exercise.title,
          caseId: exercise.case_id,
          toggles: exercise.toggles as any,
          focusHint: exercise.focus_hint || '',
          protocols: exercise.protocols as string[]
        };
      }
    } catch (err) {
      console.warn('Unexpected error during exercise fetch. Falling back to demo exercise.', {
        exerciseCode: config.exerciseCode,
        error: String(err)
      });
      exerciseConfig = demoExerciseConfig;
    }
  } else {
    // Default to demo exercise configuration when no exerciseCode is provided
    exerciseConfig = demoExerciseConfig;
  }

  console.log('Using exercise configuration', { id: exerciseConfig.id, title: exerciseConfig.title });

  const initialMessage: ConversationMessage = {
    id: generateId(8),
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
  const insertPayload = {
    mode: config.mode,
    exercise_id: config.exerciseCode,
    lesson_id: config.lessonCode,
    state: sessionState,
    started_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  };
  console.log('Inserting session payload', insertPayload);

  const { data: dbSession, error } = await supabase
    .from('sessions')
    .insert(insertPayload)
    .select()
    .single();

  if (error || !dbSession) {
    console.error('Failed to create session in database', { message: error?.message, details: (error as any)?.details });
    throw { __type: 'SESSION_INSERT_ERROR', message: error?.message || 'Unknown error', details: (error as any)?.details } as any;
  }

  const session: SessionState = {
    id: dbSession.id,
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
  
  console.log('Session created', {
    sessionId: dbSession.id,
    mode: config.mode,
    exerciseCode: config.exerciseCode,
    lessonCode: config.lessonCode
  });

  return session;
}

async function getSession(sessionId: string): Promise<SessionState | null> {
  const { data: dbSession, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !dbSession) {
    return null;
  }

  // Check if session has expired (2 hours)
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;
  const now = new Date();
  const timeSinceLastActivity = now.getTime() - new Date(dbSession.last_activity_at).getTime();
  
  if (timeSinceLastActivity > SESSION_TIMEOUT) {
    await endSession(sessionId);
    console.log('Session expired and removed', { sessionId });
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

async function addMessage(sessionId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<ConversationMessage | null> {
  const session = await getSession(sessionId);
  
  if (!session) {
    return null;
  }

  const newMessage: ConversationMessage = {
    id: generateId(8),
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
    console.error('Failed to update session state', { sessionId, error });
    return null;
  }

  console.log('Message added to session', {
    sessionId,
    messageId: newMessage.id,
    role: newMessage.role,
    contentLength: newMessage.content.length
  });

  return newMessage;
}

async function endSession(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  
  if (!session) {
    return false;
  }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to delete session', { sessionId, error });
    return false;
  }
  
  console.log('Session ended', {
    sessionId,
    duration: new Date().getTime() - session.metadata.startedAt.getTime(),
    messageCount: session.conversationHistory.length
  });

  return true;
}

// Mock AI response generation
function generateAIRoleplayResponse(userInput: string): string {
  const responses = [
    "I appreciate you taking the time to listen to my concerns. Can you help me understand what resources are available to support my child?",
    "That's reassuring to hear. I'm wondering what I can do at home to help reinforce what they're learning in school?",
    "I'm still worried about the situation. Could you walk me through what the next steps would look like?",
    "Thank you for explaining that. I want to make sure I'm being supportive in the right way. What should I watch for?"
  ];

  // Simple pattern matching for demo
  if (userInput.toLowerCase().includes('understand')) {
    return responses[0];
  } else if (userInput.toLowerCase().includes('help') || userInput.toLowerCase().includes('support')) {
    return responses[1];
  } else if (userInput.toLowerCase().includes('concern') || userInput.toLowerCase().includes('worry')) {
    return responses[2];
  } else {
    return responses[3];
  }
}

// Mock agent responses for demo
function generateMockAgentFeedback(content: string) {
  return {
    analyst: {
      rubric: {
        empathy: Math.floor(Math.random() * 3) + 3, // 3-5
        clarity: Math.floor(Math.random() * 3) + 3,
        boundaries: Math.floor(Math.random() * 3) + 3
      },
      feedback: `Good use of ${content.includes('understand') ? 'clarifying language' : 'supportive tone'}. Consider expanding on the specific resources available.`,
      suggestions: ["Ask follow-up questions", "Provide specific examples"]
    },
    navigator: {
      guidance: `Continue to ${content.includes('worry') ? 'acknowledge their concerns' : 'build on this positive interaction'}. The parent seems engaged.`,
      nextSteps: ["Listen actively", "Offer concrete next steps"]
    }
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // All requests should be POST with action in body
    if (req.method !== "POST") {
      return jsonResponse({
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST method is supported. Use action field in request body.",
      }, 405);
    }

    const body = await req.json().catch(() => ({} as any));
    const { action } = body ?? {};

    if (!action) {
      return jsonResponse({
        error: "MISSING_ACTION",
        message: "action field is required in request body",
      }, 400);
    }

    console.log('Session function called', { action, hasBody: !!body });

    // Handle different actions
    switch (action) {
      case "start": {
        const { lessonCode, exerciseCode, mode = 'exercise' } = body;

        if (!lessonCode && !exerciseCode) {
          return jsonResponse({
            error: "MISSING_CODE",
            message: "Either lessonCode or exerciseCode is required",
          }, 400);
        }

        // Create session
        try {
          const session = await createSession({
            mode: lessonCode ? 'lesson' : 'exercise',
            exerciseCode,
            lessonCode
          });

          // Generate initial Navigator guidance if feedforward is enabled
          let initialGuidance = null;
          
          if (session.config.toggles.feedforward) {
            // Mock initial guidance for demo
            initialGuidance = {
              navigator: {
                guidance: "Welcome! You'll be practicing with a concerned parent scenario. Focus on building rapport while maintaining professional boundaries.",
                suggestions: ["Start with active listening", "Ask open-ended questions", "Show empathy"]
              }
            };
          }

          return jsonResponse({
            session: {
              id: session.id,
              mode: session.mode,
              config: session.config,
              protocols: session.protocols,
              startedAt: session.metadata.startedAt
            },
            initialGuidance
          });
        } catch (e: any) {
          console.error('Session creation failed', { message: e?.message, details: e?.details });
          return jsonResponse({
            error: 'SESSION_CREATE_FAILED',
            message: e?.message || 'Failed to create session',
            details: e?.details
          }, 500);
        }
      }

      case "sendInput": {
        const { sessionId, content, timestamp } = body;

        if (!sessionId || !content || typeof content !== 'string' || content.trim().length === 0) {
          return jsonResponse({
            error: "INVALID_INPUT",
            message: "sessionId and content are required, content must be a non-empty string",
          }, 400);
        }

        // Get session
        const session = await getSession(sessionId);
        if (!session) {
          return jsonResponse({
            error: "SESSION_NOT_FOUND",
            message: "Training session not found or expired",
          }, 404);
        }

        // Add user message to session
        const userMessage = await addMessage(sessionId, {
          role: 'user',
          content: content.trim(),
          metadata: { inputTimestamp: timestamp }
        });

        if (!userMessage) {
          return jsonResponse({
            error: "MESSAGE_STORAGE_FAILED",
            message: "Failed to store user message",
          }, 500);
        }

        // Generate AI roleplay response
        const aiResponse = generateAIRoleplayResponse(content);
        
        // Add AI response to session
        if (aiResponse) {
          await addMessage(sessionId, {
            role: 'assistant',
            content: aiResponse,
            metadata: { generated: true }
          });
        }

        // Generate mock agent feedback
        const agentFeedback = generateMockAgentFeedback(content);

        // Get updated session state
        const updatedSession = await getSession(sessionId);

        return jsonResponse({
          session: {
            id: updatedSession!.id,
            messageCount: updatedSession!.conversationHistory.length,
            lastActivity: updatedSession!.metadata.lastActivityAt
          },
          aiResponse,
          agentFeedback
        });
      }

      case "get": {
        const { sessionId } = body;

        if (!sessionId) {
          return jsonResponse({
            error: "MISSING_SESSION_ID",
            message: "sessionId is required",
          }, 400);
        }
        
        const session = await getSession(sessionId);
        if (!session) {
          return jsonResponse({
            error: "SESSION_NOT_FOUND",
            message: "Session not found or expired",
          }, 404);
        }

        return jsonResponse({
          session: {
            id: session.id,
            mode: session.mode,
            config: session.config,
            protocols: session.protocols,
            messageCount: session.conversationHistory.length,
            startedAt: session.metadata.startedAt,
            lastActivity: session.metadata.lastActivityAt
          }
        });
      }

      case "end": {
        const { sessionId } = body;

        if (!sessionId) {
          return jsonResponse({
            error: "MISSING_SESSION_ID",
            message: "sessionId is required",
          }, 400);
        }
        
        const success = await endSession(sessionId);
        if (!success) {
          return jsonResponse({
            error: "SESSION_NOT_FOUND",
            message: "Session not found or already ended",
          }, 404);
        }

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({
          error: "INVALID_ACTION",
          message: `Unknown action: ${action}. Supported actions: start, sendInput, get, end`,
        }, 400);
    }

  } catch (error: any) {
    console.error('Session function error:', error);
    
    return jsonResponse({
      error: "INTERNAL_ERROR",
      message: error?.message ?? "An unexpected error occurred",
    }, 500);
  }
});