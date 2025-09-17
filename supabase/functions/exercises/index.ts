import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log("🚀 EXERCISES EDGE FUNCTION DEPLOYED SUCCESSFULLY");
console.log("📍 Function URL: https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1/exercises");
console.log("✅ CORS enabled for all origins");
console.log("🔧 Ready to handle requests");

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate unique ID
function generateId(): string {
  return 'ex_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

serve(async (req: Request): Promise<Response> => {
  console.log(`📥 ${req.method} request received at ${new Date().toISOString()}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("🔄 CORS preflight request handled");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    console.log("📝 Request body:", body);

    // Extract exercise data
    const { title, protocolStack, case: caseData, toggles, focusHint, action } = body;

    if (action !== 'create') {
      throw new Error(`Unsupported action: ${action}`);
    }

    // Validate required fields
    if (!title || !caseData?.role || !caseData?.background) {
      throw new Error('Missing required fields: title, case.role, case.background');
    }

    // Generate unique IDs
    const caseId = 'case_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    const exerciseId = generateId();

    console.log(`🆔 Generated IDs - Case: ${caseId}, Exercise: ${exerciseId}`);

    // Create case first
    const { data: insertedCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        id: caseId,
        role: caseData.role,
        background: caseData.background,
        goals: caseData.goals || null
      })
      .select()
      .single();

    if (caseError) {
      console.error("❌ Case insertion failed:", caseError);
      throw new Error(`Failed to create case: ${caseError.message}`);
    }

    console.log("✅ Case created successfully:", insertedCase);

    // Create exercise
    const { data: insertedExercise, error: exerciseError } = await supabase
      .from('exercises')
      .insert({
        id: exerciseId,
        title,
        case_id: caseId,
        protocols: protocolStack || [],
        toggles: toggles || {},
        focus_hint: focusHint || null
      })
      .select()
      .single();

    if (exerciseError) {
      console.error("❌ Exercise insertion failed:", exerciseError);
      throw new Error(`Failed to create exercise: ${exerciseError.message}`);
    }

    console.log("✅ Exercise created successfully:", insertedExercise);

    // Generate and store code
    const exerciseCode = 'EX-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const { error: codeError } = await supabase
      .from('codes')
      .insert({
        id: exerciseCode,
        type: 'exercise',
        target_id: exerciseId
      });

    if (codeError) {
      console.error("❌ Code creation failed:", codeError);
      throw new Error(`Failed to create exercise code: ${codeError.message}`);
    }

    console.log("✅ Exercise code created:", exerciseCode);

    // Prepare response in exact format expected by frontend
    const response = {
      id: exerciseId,
      code: exerciseCode,
      exercise: insertedExercise
    };

    // Sanity check for missing id or code
    if (!response.id || !response.code) {
      console.error("❌ MISSING_ID_OR_CODE_IN_RESPONSE - Response:", response);
      throw new Error("MISSING_ID_OR_CODE_IN_RESPONSE");
    }

    console.log("📤 Returning response:", response);

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error("❌ Error in exercises function:", error);
    
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