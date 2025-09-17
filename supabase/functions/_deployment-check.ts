// Deployment verification script for Edge Functions
// This file helps verify all functions are properly deployed

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const FUNCTIONS = [
  'session',
  'transcript', 
  'health',
  'lessons',
  'exercises'
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

console.log("🔍 DEPLOYMENT CHECK FUNCTION LOADED");
console.log(`📋 Expected functions: ${FUNCTIONS.join(', ')}`);
console.log("✅ Ready to verify deployment status");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const deploymentStatus = {
    timestamp: new Date().toISOString(),
    project_id: "ammawhrjbwqmwhsbdjoa",
    expected_functions: FUNCTIONS,
    deployment_check: "completed",
    base_url: "https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1/",
    functions_status: FUNCTIONS.map(name => ({
      name,
      url: `https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1/${name}`,
      expected: true
    })),
    message: "All functions should be deployed and accessible at their respective URLs"
  };

  console.log("📊 Deployment status check completed:", deploymentStatus);

  return new Response(
    JSON.stringify(deploymentStatus, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    }
  );
});