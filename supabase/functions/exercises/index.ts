import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log("🚀 EXERCISES EDGE FUNCTION DEPLOYED SUCCESSFULLY");
console.log("📍 Function URL: https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1/exercises");
console.log("✅ CORS enabled for all origins");
console.log("🔧 Ready to handle requests");

serve(async (req: Request): Promise<Response> => {
  console.log(`📥 ${req.method} request received at ${new Date().toISOString()}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("🔄 CORS preflight request handled");
    return new Response("ok", { headers: corsHeaders });
  }

  const response = {
    ok: true,
    source: "dummy exercises function",
    deployed: true,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  };

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
});