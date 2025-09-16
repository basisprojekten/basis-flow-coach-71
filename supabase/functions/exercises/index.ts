console.log("EXERCISES FUNCTION v3 LOADED", { now: new Date().toISOString() });

// Supabase Edge Function: exercises
// Handles exercise creation, retrieval, and management

// deno-lint-ignore-file no-explicit-any

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

// Generate unique exercise code
function generateExerciseCode(): string {
  return `EX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

// Generate unique lesson code
function generateLessonCode(): string {
  return `LS-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({
      error: "METHOD_NOT_ALLOWED",
      message: "Only POST method is supported",
    }, 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    console.log("Exercises function called", { action, rawBody: body });

    switch (action) {
      case 'create': {
        console.log("exercises.create: start");

        // Normalize inputs (accept both protocolStack and protocols, set safe defaults)
        const protocolStack = Array.isArray(body.protocolStack) ? body.protocolStack : [];
        const protocols = protocolStack.length > 0
          ? protocolStack
          : (Array.isArray(body.protocols) && body.protocols.length > 0 ? body.protocols : ["basis-v1"]);

        const toggles = body.toggles ?? { feedforward: true, iterative: true, mode: "text", skipRoleplayForGlobalFeedback: false };

        const { title, focusHint, case: caseData } = body;
        console.log("exercises.create: normalized inputs", {
          title,
          focusHint,
          caseData,
          protocols,
          toggles
        });

        if (!title || !focusHint || !caseData) {
          console.log("exercises.create: missing required fields", { titlePresent: !!title, focusHintPresent: !!focusHint, casePresent: !!caseData });
          return jsonResponse({
            error: "MISSING_REQUIRED_FIELDS",
            message: "Title, focusHint, and case data are required",
          }, 400);
        }

        // IDs
        const exerciseCode = generateExerciseCode();
        const caseId = `case_${crypto.randomUUID().slice(0,8)}`;
        console.log("exercises.create: generated IDs", { exerciseCode, caseId });

        // Payloads we will insert
        const casePayload = {
          id: caseId,
          role: caseData?.role,
          background: caseData?.background,
          goals: caseData?.goals,
          created_at: new Date().toISOString(),
        };
        console.log("Prepared insert payload for cases:", casePayload);

        const exercisePayload = {
          id: exerciseCode,
          title,
          focus_hint: focusHint,
          case_id: caseId,
          toggles,
          protocols,
          created_at: new Date().toISOString(),
        };
        console.log("Prepared insert payload for exercises:", exercisePayload);

        // 1) Create the case row
        console.log("Inserting into cases ...");
        const { error: caseError } = await supabase
          .from('cases')
          .insert(casePayload);

        if (caseError) {
          console.error("Case insert failed", { code: caseError.code, message: caseError.message, details: caseError });
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to create case for exercise",
            details: caseError
          }, 500);
        }
        
        // 2) Create the exercise record linking the case
        console.log("Inserting into exercises ...");
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercises')
          .insert(exercisePayload)
          .select()
          .single();

        if (exerciseError) {
          console.error("Exercise insert failed", { code: exerciseError.code, message: exerciseError.message, details: exerciseError });
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to create exercise",
            details: exerciseError
          }, 500);
        }

        if (exercise) {
          console.log("Exercise created successfully", { id: exerciseCode, title, caseId });
        }

        return jsonResponse({
          id: exerciseCode,
          code: exerciseCode,
          exercise: exercise
        });
      }

      case 'list': {
        console.log("exercises.list: start");
        
        const { data: exercises, error } = await supabase
          .from('exercises')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching exercises:', error);
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to fetch exercises",
          }, 500);
        }

        return jsonResponse(exercises || []);
      }

      case 'get': {
        const { exerciseId } = body;
        console.log("exercises.get: start", { exerciseId });

        if (!exerciseId) {
          return jsonResponse({
            error: "MISSING_EXERCISE_ID",
            message: "Exercise ID is required",
          }, 400);
        }

        const { data: exercise, error } = await supabase
          .from('exercises')
          .select('*')
          .eq('id', exerciseId)
          .single();

        if (error) {
          console.error('Error fetching exercise:', error);
          return jsonResponse({
            error: "EXERCISE_NOT_FOUND",
            message: "Exercise not found",
          }, 404);
        }

        return jsonResponse(exercise);
      }

      default: {
        return jsonResponse({
          error: "INVALID_ACTION",
          message: `Unknown action: ${action}. Supported actions: create, list, get`,
        }, 400);
      }
    }

  } catch (error: any) {
    console.error('Exercises function error:', error);
    return jsonResponse({
      error: "INTERNAL_ERROR",
      message: error?.message || "An unexpected error occurred",
    }, 500);
  }
});