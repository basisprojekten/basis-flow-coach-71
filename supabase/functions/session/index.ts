// Supabase Edge Function: session
// Complete session management with action-based routing for Supabase Edge Functions

// deno-lint-ignore-file no-explicit-any

import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Attempting to resolve exercise code and fetch exercise from Supabase', { exerciseCode: config.exerciseCode });
    try {
      // First, resolve the exercise code to get the target_id
      const { data: codeRecord, error: codeError } = await supabase
        .from('codes')
        .select('target_id')
        .eq('type', 'exercise')
        .eq('id', config.exerciseCode)
        .maybeSingle();
      
      console.log('Code resolution result', { hasError: !!codeError, found: !!codeRecord, targetId: codeRecord?.target_id });
      
      if (codeError || !codeRecord?.target_id) {
        console.warn('Exercise code not found or query error. Falling back to demo exercise.', {
          exerciseCode: config.exerciseCode,
          error: codeError?.message
        });
        exerciseConfig = demoExerciseConfig;
      } else {
        // Now fetch the actual exercise using the target_id
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercises')
          .select('*')
          .eq('id', codeRecord.target_id)
          .maybeSingle();
        
        console.log('Exercise fetch result', { hasError: !!exerciseError, found: !!exercise, exerciseId: codeRecord.target_id });
        
        if (exerciseError || !exercise) {
          console.warn('Exercise not found for target_id. Falling back to demo exercise.', {
            exerciseCode: config.exerciseCode,
            targetId: codeRecord.target_id,
            error: exerciseError?.message
          });
          exerciseConfig = demoExerciseConfig;
        } else {
          // Create exercise config with defaults for missing fields
          exerciseConfig = {
            id: exercise.id,
            title: exercise.title,
            caseId: 'default-case', // Default case ID since exercises table doesn't have case_id
            toggles: {
              feedforward: true,
              iterative: true,
              mode: 'text' as const,
              skipRoleplayForGlobalFeedback: false
            },
            focusHint: exercise.focus_area || '', // Use focus_area as focusHint
            protocols: ['basis-v1'] // Default protocol
          };
        }
      }
    } catch (err) {
      console.warn('Unexpected error during exercise resolution. Falling back to demo exercise.', {
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

// Real OpenAI-powered roleplay response generation
async function generateRoleplayResponse(userInput: string, context: any): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  console.log('About to call OpenAI for roleplay response', {
    action: 'roleplay',
    contentLength: userInput.length,
    hasContext: !!context
  });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a concerned parent character in a training simulation. You are worried about your child's academic progress and emotional well-being. You want to understand what support is available and how you can help at home. Stay in character as a worried but cooperative parent seeking help. Respond naturally and authentically to what the school professional just said.`
          },
          {
            role: 'user',
            content: `The school professional just said: "${userInput}". How do you respond as the concerned parent?`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI response raw', data);
    console.log('OpenAI roleplay response generated successfully');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating roleplay response:', error);
    // Fallback to simple response on error
    return "I appreciate you taking the time to discuss this with me. Could you help me understand what the next steps would be?";
  }
}

// Real OpenAI-powered agent feedback generation
async function generateAgentFeedback(content: string, conversationHistory: ConversationMessage[]): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  console.log('About to call OpenAI for agent feedback', {
    action: 'agent_feedback',
    contentLength: content.length,
    historyLength: conversationHistory.length
  });

  const agentFeedback: any = {};

  try {
    // Generate Analyst feedback
    const analystResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an Analyst Agent providing retrospective feedback. Analyze ONLY what just happened in the student's response. Never give future advice. Return feedback as JSON with this exact structure:
{
  "type": "iterative_feedback",
  "segment_id": "seg_" + random_8_chars,
  "rubric": [
    {"field": "empathy", "score": 1-5},
    {"field": "clarity", "score": 1-5},
    {"field": "boundaries", "score": 1-5}
  ],
  "evidence_quotes": ["quote from student response"],
  "past_only_feedback": "retrospective analysis focusing only on what just happened"
}`
          },
          {
            role: 'user',
            content: `Analyze this student response: "${content}"`
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (analystResponse.ok) {
      const analystData = await analystResponse.json();
      console.log('OpenAI Analyst response raw', analystData);
      try {
        agentFeedback.analyst = JSON.parse(analystData.choices[0].message.content);
      } catch {
        // Fallback if JSON parsing fails
        agentFeedback.analyst = {
          type: "iterative_feedback",
          segment_id: "seg_" + Math.random().toString(36).substr(2, 8),
          rubric: [
            {"field": "empathy", "score": 3},
            {"field": "clarity", "score": 3},
            {"field": "boundaries", "score": 3}
          ],
          evidence_quotes: [content.substring(0, 50) + "..."],
          past_only_feedback: analystData.choices[0].message.content
        };
      }
    }

    // Generate Navigator feedback
    const navigatorResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Navigator Agent providing feedforward guidance. Give ONLY future-focused guidance. Never analyze what happened. Return guidance as JSON with this exact structure:
{
  "type": "feedforward",
  "guidance": "forward-looking guidance message",
  "next_steps": ["action 1", "action 2"]
}`
          },
          {
            role: 'user',
            content: `Provide feedforward guidance for the student's next response. They just said: "${content}"`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (navigatorResponse.ok) {
      const navigatorData = await navigatorResponse.json();
      console.log('OpenAI Navigator response raw', navigatorData);
      try {
        agentFeedback.navigator = JSON.parse(navigatorData.choices[0].message.content);
      } catch {
        // Fallback if JSON parsing fails
        agentFeedback.navigator = {
          type: "feedforward",
          guidance: navigatorData.choices[0].message.content,
          next_steps: ["Continue building rapport", "Ask clarifying questions"]
        };
      }
    }

    console.log('Agent feedback generated successfully');
    return agentFeedback;
  } catch (error) {
    console.error('Error generating agent feedback:', error);
    // Return fallback mock data on error
    return {
      analyst: {
        type: "iterative_feedback",
        segment_id: "seg_error",
        rubric: [
          {"field": "empathy", "score": 3},
          {"field": "clarity", "score": 3},
          {"field": "boundaries", "score": 3}
        ],
        evidence_quotes: ["Error occurred"],
        past_only_feedback: "Unable to analyze due to technical error"
      },
      navigator: {
        type: "feedforward",
        guidance: "Continue with the conversation",
        next_steps: ["Stay engaged", "Listen actively"]
      }
    };
  }
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
          console.log('Session not found in sendInput', { sessionId });
          return jsonResponse({
            error: "SESSION_NOT_FOUND",
            message: "Training session not found or expired",
          }, 404);
        }

        console.log('Session retrieved successfully in sendInput', { 
          sessionId, 
          messageCount: session.conversationHistory.length 
        });

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
        const aiResponse = await generateRoleplayResponse(content, { session });
        
        // Add AI response to session
        if (aiResponse) {
          await addMessage(sessionId, {
            role: 'assistant',
            content: aiResponse,
            metadata: { generated: true }
          });
        }

        // Generate real agent feedback
        const agentFeedback = await generateAgentFeedback(content, session.conversationHistory);

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
          console.log('Session not found in get', { sessionId });
          return jsonResponse({
            error: "SESSION_NOT_FOUND",
            message: "Session not found or expired",
          }, 404);
        }

        console.log('Session retrieved successfully in get', { 
          sessionId, 
          messageCount: session.conversationHistory.length 
        });

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
          console.log('Session not found in end', { sessionId });
          return jsonResponse({
            error: "SESSION_NOT_FOUND",
            message: "Session not found or already ended",
          }, 404);
        }

        console.log('Session ended successfully', { sessionId });

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