import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ReviewerAgent } from './reviewerAgent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EndSessionRequest {
  session_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id } = await req.json() as EndSessionRequest;

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing session end for: ${session_id}`);

    // 1. Fetch session data
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionData) {
      console.error('Session fetch error:', sessionError);
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get exercise and protocols data
    let exerciseData = null;
    let protocolsData: any[] = [];
    
    if (sessionData.exercise_id) {
      // Fetch exercise data
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select(`
          *,
          exercise_documents (
            document_id,
            documents (
              id,
              content,
              document_type,
              file_name
            )
          )
        `)
        .eq('id', sessionData.exercise_id)
        .single();

      if (!exerciseError && exercise) {
        exerciseData = exercise;
        
        // Extract protocol documents
        const protocolDocuments = exercise.exercise_documents
          ?.filter((ed: any) => ed.documents?.document_type === 'protocol')
          ?.map((ed: any) => ed.documents) || [];
        
        protocolsData = protocolDocuments;
      }
    }

    // 3. Build transcript from conversation history
    const conversationHistory = sessionData.state?.conversationHistory || [];
    
    let transcript = '';
    for (const message of conversationHistory) {
      const timestamp = new Date(message.timestamp).toLocaleTimeString('sv-SE');
      
      if (message.role === 'system') {
        transcript += `**System (${timestamp}):** ${message.content}\n\n`;
      } else if (message.role === 'user') {
        transcript += `**Student (${timestamp}):** ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        transcript += `**Rollperson (${timestamp}):** ${message.content}\n\n`;
      }
    }

    if (!transcript.trim()) {
      return new Response(JSON.stringify({ error: 'No conversation history found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Prepare reviewer agent
    const reviewerAgent = new ReviewerAgent();
    
    // Extract protocol content for context
    const protocolContent = protocolsData
      .map(p => p.content)
      .filter(Boolean)
      .join('\n\n');

    const exerciseConfig = {
      focusHint: exerciseData?.focus_area || 'Allmän konversationsanalys',
      title: exerciseData?.title || 'Träningssession',
      meta: {
        protocolContent: protocolContent || 'BASIS-protokoll: Aktivt lyssnande, minimal feedback, parafrasering, klargörande frågor, empati, struktur.'
      }
    };

    console.log(`Analyzing transcript with focus: ${exerciseConfig.focusHint}`);

    // 5. Generate final feedback
    const protocols = protocolsData.map(p => p.id) || ['basis-protocol'];
    const reviewerResponse = await reviewerAgent.analyzeTranscript(
      protocols,
      transcript,
      exerciseConfig
    );

    // 6. Store final feedback in session state
    const updatedState = {
      ...sessionData.state,
      finalFeedback: reviewerResponse,
      isCompleted: true,
      completedAt: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ 
        state: updatedState,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Session update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save final feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Session ${session_id} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      finalFeedback: reviewerResponse,
      exerciseTitle: exerciseData?.title || 'Träningssession'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in end-session-and-review function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});