import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve((_req) =>
  new Response(
    JSON.stringify({ ok: true, source: "dummy exercises function" }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  )
);