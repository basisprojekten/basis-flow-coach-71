// Supabase Edge Function: health
// Returns a simple health status with CORS enabled

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = {
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      services: {
        server: "ok",
      },
    };

    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      status: 200,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        status: "down",
        error: e?.message ?? "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        status: 500,
      }
    );
  }
});
