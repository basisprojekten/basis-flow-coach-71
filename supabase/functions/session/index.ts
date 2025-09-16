// Supabase Edge Function: session
// Minimal implementation to start a session with CORS enabled

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status,
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Only implement POST /session for now
  if (req.method === "POST") {
    try {
      const path = url.pathname;
      // Ensure base create endpoint (no id in path)
      const isCreate = /\/functions\/v1\/session\/?$/.test(path);

      if (!isCreate) {
        // Not implemented: other session endpoints
        return jsonResponse({
          error: "NOT_IMPLEMENTED",
          message: "This session endpoint is not yet implemented in Edge Functions.",
        }, 501);
      }

      const body = await req.json().catch(() => ({} as any));
      const { lessonCode, exerciseCode } = body ?? {};

      if (!lessonCode && !exerciseCode) {
        return jsonResponse({
          error: "MISSING_CODE",
          message: "Either lessonCode or exerciseCode is required",
        }, 400);
      }

      const mode = lessonCode ? "lesson" : "exercise";
      const id = crypto.randomUUID();

      const response = {
        session: {
          id,
          mode,
          // Minimal defaults; align with frontend expectations
          config: {
            toggles: {
              iterative: true,
              feedforward: true,
            },
            focusHint: mode === "lesson" ? "Lesson practice" : "Exercise practice",
          },
          protocols: ["basis-v1"],
          startedAt: new Date().toISOString(),
        },
        initialGuidance: null,
      };

      return jsonResponse(response, 200);
    } catch (e: any) {
      return jsonResponse({
        error: "SESSION_CREATION_FAILED",
        message: e?.message ?? "Failed to create session",
      }, 500);
    }
  }

  return jsonResponse({
    error: "METHOD_NOT_ALLOWED",
    message: "Only POST is allowed",
  }, 405);
});
