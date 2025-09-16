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

    console.log(`Exercises function called with action: ${action}`);

    switch (action) {
      case 'create': {
        const { title, focusHint, case: caseData, toggles, protocolStack } = body;

        if (!title || !focusHint || !caseData) {
          return jsonResponse({
            error: "MISSING_REQUIRED_FIELDS",
            message: "Title, focusHint, and case data are required",
          }, 400);
        }

        const exerciseCode = generateExerciseCode();
        const caseId = `case-${Math.random().toString(36).substr(2, 8)}`;

        // Normalize protocols from protocolStack
        const protocols = Array.isArray(protocolStack) && protocolStack.length > 0
          ? protocolStack
          : ["basis-v1"]; // sensible default
        
        // 1) Create the case row
        const { error: caseError } = await supabase
          .from('cases')
          .insert({
            id: caseId,
            role: caseData.role,
            background: caseData.background,
            goals: caseData.goals,
            created_at: new Date().toISOString(),
          });

        if (caseError) {
          console.error('Error creating case for exercise:', caseError);
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to create case for exercise",
            details: caseError
          }, 500);
        }
        
        // 2) Create the exercise record linking the case
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercises')
          .insert({
            id: exerciseCode,
            title,
            focus_hint: focusHint,
            case_id: caseId,
            toggles: toggles,
            protocols: protocols,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (exerciseError) {
          console.error('Error creating exercise:', exerciseError);
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to create exercise",
            details: exerciseError
          }, 500);
        }

        console.log('Exercise created successfully:', { id: exerciseCode, title, caseId });

        return jsonResponse({
          id: exerciseCode,
          code: exerciseCode,
          exercise: exercise
        });
      }

      case 'list': {
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