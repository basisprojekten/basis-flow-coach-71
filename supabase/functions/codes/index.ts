import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log("🚀 CODES EDGE FUNCTION DEPLOYED SUCCESSFULLY");
console.log("📍 Function URL: https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1/codes");
console.log("✅ CORS enabled for all origins");
console.log("🔧 Ready to handle requests");

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request): Promise<Response> => {
  console.log(`📥 ${req.method} request received at ${new Date().toISOString()}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("🔄 CORS preflight request handled");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log(`❌ Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ 
        error: "METHOD_NOT_ALLOWED", 
        message: "Only POST method is supported" 
      }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }

  try {
    const body = await req.json();
    console.log(`📋 Request body:`, body);
    
    const { action } = body;
    
    if (action !== "list") {
      console.log(`❌ Invalid action: ${action}`);
      return new Response(
        JSON.stringify({ 
          error: "INVALID_ACTION", 
          message: "Only 'list' action is supported" 
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // First, fetch all codes from the codes table
    console.log("🔍 Fetching codes from database...");
    const { data: codes, error: codesError } = await supabase
      .from('codes')
      .select('id, type, target_id, created_at')
      .order('created_at', { ascending: false });

    if (codesError) {
      console.error("❌ Error fetching codes:", codesError);
      throw new Error(`Failed to fetch codes: ${codesError.message}`);
    }

    console.log(`📊 Found ${codes?.length || 0} codes in database`);

    if (!codes || codes.length === 0) {
      console.log("✅ No codes found, returning empty array");
      return new Response(
        JSON.stringify([]),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Now enrich each code with exercise/lesson details using separate queries
    const enrichedCodes = await Promise.all(
      codes.map(async (code) => {
        const targetId = code.target_id;

        try {
          let title = 'Unknown';
          let details: Record<string, unknown> = {};

          if (code.type === 'exercise') {
            console.log(`🔍 Fetching exercise details for ${targetId}`);
            const { data: exercise, error: exerciseError } = await supabase
              .from('exercises')
              .select('title')
              .eq('id', targetId)
              .maybeSingle();

            if (exerciseError) {
              console.error(`⚠️ Error fetching exercise ${targetId}:`, exerciseError);
            } else if (exercise) {
              title = exercise.title || 'Unknown';
              details = {};
            }
          } else if (code.type === 'lesson') {
            console.log(`🔍 Fetching lesson details for ${targetId}`);
            const { data: lesson, error: lessonError } = await supabase
              .from('lessons')
              .select('title')
              .eq('id', targetId)
              .maybeSingle();

            if (lessonError) {
              console.error(`⚠️ Error fetching lesson ${targetId}:`, lessonError);
            } else if (lesson) {
              title = lesson.title || 'Unknown';
              details = {};
            }
          }

          return {
            id: code.id,
            type: code.type,
            target_id: targetId,
            lesson_id: code.type === 'lesson' ? targetId : null,
            exercise_id: code.type === 'exercise' ? targetId : null,
            created_at: code.created_at,
            title,
            details
          };
        } catch (error) {
          console.error(`⚠️ Error enriching code ${code.id}:`, error);
          // Return safe fallback values
          return {
            id: code.id,
            type: code.type,
            target_id: targetId,
            lesson_id: code.type === 'lesson' ? targetId : null,
            exercise_id: code.type === 'exercise' ? targetId : null,
            created_at: code.created_at,
            title: 'Unknown',
            details: {}
          };
        }
      })
    );

    console.log(`✅ Successfully enriched ${enrichedCodes.length} codes`);

    return new Response(
      JSON.stringify(enrichedCodes),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error("❌ Error in codes function:", error);
    
    const errorResponse = {
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});
