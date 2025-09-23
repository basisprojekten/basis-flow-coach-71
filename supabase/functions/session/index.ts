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
  meta?: { linkedDocsSummary?: string; caseContent?: string; protocolContent?: string; };
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
  let linkedDocsSummary = '';
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
        console.warn('Exercise code not found or query error.', {
          exerciseCode: config.exerciseCode,
          error: codeError?.message
        });
        throw { __type: 'EXERCISE_CODE_NOT_FOUND', message: 'Invalid or unknown exerciseCode', __httpStatus: 400 } as any;
      } else {
        // Now fetch the actual exercise using the target_id
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercises')
          .select(`
            *,
            instruction_document:documents!exercises_instruction_document_id_fkey(content)
          `)
          .eq('id', codeRecord.target_id)
          .maybeSingle();
        
        console.log('Exercise fetch result', { hasError: !!exerciseError, found: !!exercise, exerciseId: codeRecord.target_id });
        
        if (exerciseError || !exercise) {
          console.warn('Exercise not found for target_id.', {
            exerciseCode: config.exerciseCode,
            targetId: codeRecord.target_id,
            error: exerciseError?.message
          });
          throw { __type: 'EXERCISE_NOT_FOUND', message: 'Exercise not found for provided code', __httpStatus: 404 } as any;
        } else {
          // Fetch linked documents with content to inform prompts
          const { data: links, error: linksError } = await supabase
            .from('exercise_documents')
            .select('document_id')
            .eq('exercise_id', exercise.id);
          let documents: any[] = [];
          let caseContent = '';
          let protocolContent = '';
          if (!linksError && links && links.length) {
            const docIds = links.map((l: any) => l.document_id);
            const { data: docs } = await supabase
              .from('documents')
              .select('id, file_name, document_type, content')
              .in('id', docIds);
            documents = docs || [];
            
            // Extract content by type
            documents.forEach(doc => {
              if (doc.document_type === 'case' && doc.content) {
                caseContent = doc.content;
              } else if (doc.document_type === 'protocol' && doc.content) {
                protocolContent = doc.content;
              }
            });
          }
          linkedDocsSummary = documents.length ? `Linked documents: ${documents.map(d => `${d.document_type}:${d.file_name}`).join(', ')}` : '';

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
            protocols: ['basis-v1'], // Default protocol
            meta: { 
              linkedDocsSummary: linkedDocsSummary || undefined,
              caseContent: caseContent || undefined,
              protocolContent: protocolContent || undefined,
              instructionContent: exercise.instruction_document?.content || undefined
            }
          };
        }
      }
    } catch (err) {
      console.error('Unexpected error during exercise resolution', {
        exerciseCode: config.exerciseCode,
        error: String(err)
      });
      throw { __type: 'EXERCISE_RESOLUTION_ERROR', message: 'Failed to resolve exercise', details: String(err), __httpStatus: 500 } as any;
    }
  } else {
    // Default to demo exercise configuration when no exerciseCode is provided
    exerciseConfig = demoExerciseConfig;
  }

  console.log('Using exercise configuration', { id: exerciseConfig.id, title: exerciseConfig.title });

  const initialMessage: ConversationMessage = {
    id: generateId(8),
    role: 'system',
    content: `Welcome to BASIS: "${exerciseConfig.title}". Focus: ${exerciseConfig.focusHint || 'General practice'}.${linkedDocsSummary ? ` ${linkedDocsSummary}` : ''}`,
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
    exercise_id: config.exerciseCode ? exerciseConfig.id : null,
    lesson_id: config.lessonCode ?? null,
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
    exerciseId: exerciseConfig.id,
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
            content: (() => {
              const cfg = (context?.session?.config) as any;
              let systemPrompt = `Du är en rollspelskaraktär i en träningsövning för socionomstudenter.`;
              
              // Inject case content if available
              if (cfg?.meta?.caseContent) {
                systemPrompt += `\n\nFÖLJANDE CASE-INFORMATION DEFINIERAR DIN KARAKTÄR OCH SITUATION:\n${cfg.meta.caseContent}\n`;
                systemPrompt += `\nAGERA EXAKT ENLIGT DENNA CASE-BESKRIVNING. Din karaktär, situation och bakgrund kommer från texten ovan.`;
              } else {
                // Fallback if no case content
                systemPrompt += `\n\nDu är en "Orolig förälder" som har kontaktat socialtjänsten med oro för sitt barn. Du är genuint orolig för ditt barns välmående och kan vara emotionell, defensiv eller överväldigad.`;
              }
              
              systemPrompt += `\n\nRIKTLINJER:
- Håll dig strikt inom din definierade karaktär och situation
- Var realistisk och trovärdig i dina svar
- Svara på svenska
- Låt samtalet utvecklas naturligt baserat på studentens input
- Ge studenten möjlighet att träna aktivt lyssnande och professionell kommunikation
- Svara kort och naturligt (1-2 meningar) som karaktären skulle göra`;

              // Add protocol guidance if available
              if (cfg?.meta?.protocolContent) {
                systemPrompt += `\n\nTRÄNINGSFOKUS (för din information): Studenten tränar enligt följande protokoll:\n${cfg.meta.protocolContent}`;
              }
              
              return systemPrompt;
            })()
          },
          {
            role: 'user',
            content: userInput
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
async function generateAgentFeedback(content: string, conversationHistory: ConversationMessage[], exerciseConfig?: ExerciseConfig): Promise<any> {
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
            content: (() => {
              const focus = exerciseConfig?.focus || exerciseConfig?.focusHint || 'Allmän övning av aktivt lyssnande';
              const title = exerciseConfig?.title ?? 'Namnlös övning';
              const protocolContent = exerciseConfig?.meta?.protocolContent;
              
              let systemPrompt = `Du är en Analytiker-agent som ger retrospektiv feedback för övningen "${title}". Analysera ENDAST vad som just hände i studentens svar. Fokusera särskilt på: ${focus}. Ge aldrig framtida råd.`;
              
              if (protocolContent) {
                systemPrompt += `\n\nPROTOKOLL FÖR BEDÖMNING:\n${protocolContent}\n\nAnvänd detta protokoll som grund för din bedömning. Analysera hur väl studenten följer protokollets riktlinjer.`;
              }
              
              systemPrompt += `\n\nSvara med JSON i exakt denna struktur:\n{\n  "type": "iterative_feedback",\n  "segment_id": "seg_" + random_8_chars,\n  "rubric": [\n    {"field": "empathy", "score": 1-5},\n    {"field": "clarity", "score": 1-5},\n    {"field": "boundaries", "score": 1-5}\n  ],\n  "evidence_quotes": ["citat från studentens svar"],\n  "past_only_feedback": "Retrospektiv analys som fokuserar endast på vad som precis hände (max 2-3 meningar på svenska)"\n}`;
              
              return systemPrompt;
            })()
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
            content: (() => {
              const focus = exerciseConfig?.focus || exerciseConfig?.focusHint || 'allmän övning av aktivt lyssnande';
              const title = exerciseConfig?.title ?? 'Namnlös övning';
              const protocolContent = exerciseConfig?.meta?.protocolContent;
              
              let systemPrompt = `Du är en Navigatör-agent för övningen "${title}". Ge ENDAST framåtriktad, handlingsbar vägledning som är anpassad till fokuset: ${focus}. Analysera aldrig det förflutna.`;
              
              if (protocolContent) {
                systemPrompt += `\n\nPROTOKOLL FÖR VÄGLEDNING:\n${protocolContent}\n\nAnvänd detta protokoll för att guida studenten mot rätt tekniker och förhållningssätt i deras nästa steg.`;
              }
              
              systemPrompt += `\n\nDin roll är att hjälpa studenten att engagera sig bättre med rollspelskaraktären i nästa interaktion. Fokusera på att guida studenten mot att använda tekniker från protokollet för att bygga bättre rapport och kommunikation med rollspelskaraktären.`;
              
              systemPrompt += `\n\nSvara med JSON i exakt denna struktur:\n{\n  "type": "feedforward",\n  "guidance": "framåtriktad vägledning på svenska (max 2-3 meningar)",\n  "next_steps": ["handling 1", "handling 2"]\n}`;
              
              return systemPrompt;
            })()
          },
          {
            role: 'user',
            content: `Ge framåtriktad vägledning för studentens nästa interaktion med rollspelskaraktären. Hur kan studenten förbättra sitt nästa svar för att bättre engagera sig med karaktären enligt fokuset "${exerciseConfig?.focus || exerciseConfig?.focusHint || 'aktivt lyssnande'}"?`
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
          const status = (e && typeof e === 'object' && '__httpStatus' in e) ? (e as any).__httpStatus : 500;
          return jsonResponse({
            error: (e && typeof e === 'object' && '__type' in e) ? (e as any).__type : 'SESSION_CREATE_FAILED',
            message: e?.message || 'Failed to create session',
            details: e?.details
          }, status);
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
        const agentFeedback = await generateAgentFeedback(content, session.conversationHistory, session.config);

        // Get updated session state
        const updatedSession = await getSession(sessionId);

        // Remove rubric data from analyst feedback before sending to client (should be hidden from students)
        const clientFeedback = { ...agentFeedback };
        if (clientFeedback.analyst && clientFeedback.analyst.rubric) {
          delete clientFeedback.analyst.rubric;
        }

        return jsonResponse({
          session: {
            id: updatedSession!.id,
            messageCount: updatedSession!.conversationHistory.length,
            lastActivity: updatedSession!.metadata.lastActivityAt
          },
          aiResponse,
          agentFeedback: clientFeedback
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