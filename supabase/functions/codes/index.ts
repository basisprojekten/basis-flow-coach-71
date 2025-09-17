import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

console.log("🚀 CODES EDGE FUNCTION DEPLOYED SUCCESSFULLY");
console.log("📍 Function URL: https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1/codes");
console.log("✅ CORS enabled for all origins");
console.log("🔧 Ready to handle requests");

// Initialize Supabase client
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

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ 
        error: "METHOD_NOT_ALLOWED", 
        message: "Only GET method is supported" 
      }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }

  try {
    // Fetch all codes with their associated exercise/lesson details
    const { data: codes, error } = await supabase
      .from('codes')
      .select(`
        id,
        type,
        target_id,
        created_at,
        exercises!codes_target_id_fkey(title, focus_hint),
        lessons!codes_target_id_fkey(title, objectives)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching codes:", error);
      throw new Error(`Failed to fetch codes: ${error.message}`);
    }

    // Format the response to include exercise/lesson details
    const formattedCodes = codes?.map(code => {
      const isExercise = code.type === 'exercise';
      const details = isExercise ? code.exercises : code.lessons;
      
      return {
        id: code.id,
        type: code.type,
        target_id: code.target_id,
        created_at: code.created_at,
        title: details?.title || 'Unknown',
        details: isExercise 
          ? { focus_hint: details?.focus_hint }
          : { objectives: details?.objectives || [] }
      };
    }) || [];

    console.log(`✅ Retrieved ${formattedCodes.length} codes`);

    return new Response(
      JSON.stringify(formattedCodes),
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