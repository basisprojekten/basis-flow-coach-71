// Supabase Edge Function: lessons
// Handles lesson creation, retrieval, and management

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

    console.log(`Lessons function called with action: ${action}`);

    switch (action) {
      case 'create': {
        const { title, objectives, exerciseOrder = [] } = body;

        if (!title || !objectives || !Array.isArray(objectives) || objectives.length === 0) {
          return jsonResponse({
            error: "MISSING_REQUIRED_FIELDS",
            message: "Title and objectives array are required",
          }, 400);
        }

        const lessonCode = generateLessonCode();
        
        // Create the lesson record
        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            title
          })
          .select()
          .single();

        if (lessonError) {
          console.error('Error creating lesson:', lessonError);
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to create lesson",
            details: lessonError
          }, 500);
        }

        console.log('Lesson created successfully:', { id: lessonCode, title });

        // Generate and store code  
        const displayCode = 'LS-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const { data: lessonCodeRow, error: codeError } = await supabase
          .from('codes')
          .insert({
            id: displayCode,
            type: 'lesson',
            target_id: lesson.id
          })
          .select()
          .single();

        if (codeError) {
          console.error('Error creating lesson code:', codeError);
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to create lesson code",
            details: codeError
          }, 500);
        }

        console.log('Lesson code created successfully:', lessonCodeRow);

        return jsonResponse({
          id: lesson.id,
          code: lessonCodeRow?.id ?? displayCode,
          lesson,
          accessCode: lessonCodeRow,
        });
      }

      case 'list': {
        const { data: lessons, error } = await supabase
          .from('lessons')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching lessons:', error);
          return jsonResponse({
            error: "DATABASE_ERROR",
            message: "Failed to fetch lessons",
          }, 500);
        }

        return jsonResponse(lessons || []);
      }

      case 'get': {
        const { lessonId } = body;

        if (!lessonId) {
          return jsonResponse({
            error: "MISSING_LESSON_ID",
            message: "Lesson ID is required",
          }, 400);
        }

        const { data: lesson, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();

        if (error) {
          console.error('Error fetching lesson:', error);
          return jsonResponse({
            error: "LESSON_NOT_FOUND",
            message: "Lesson not found",
          }, 404);
        }

        return jsonResponse(lesson);
      }

      default: {
        return jsonResponse({
          error: "INVALID_ACTION",
          message: `Unknown action: ${action}. Supported actions: create, list, get`,
        }, 400);
      }
    }

  } catch (error: any) {
    console.error('Lessons function error:', error);
    return jsonResponse({
      error: "INTERNAL_ERROR",
      message: error?.message || "An unexpected error occurred",
    }, 500);
  }
});
