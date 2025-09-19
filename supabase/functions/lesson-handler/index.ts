import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateLessonRequest {
  title: string;
}

interface CreateExerciseRequest {
  title: string;
  lesson_id?: string;
  focus_area: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    const { type } = requestBody;

    console.log('Processing request for type:', type);

    if (type === 'lesson') {
      const { title }: CreateLessonRequest = requestBody;

      if (!title) {
        return new Response(JSON.stringify({ 
          error: 'VALIDATION_ERROR', 
          message: 'Title is required for lessons' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('lessons')
        .insert({ title })
        .select()
        .single();

      if (error) {
        console.error('Database error creating lesson:', error);
        return new Response(JSON.stringify({ 
          error: 'DATABASE_ERROR', 
          message: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Lesson created successfully:', data.id);
      return new Response(JSON.stringify({ 
        success: true, 
        lesson: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'exercise') {
      const { title, lesson_id, focus_area }: CreateExerciseRequest = requestBody;

      if (!title || !focus_area) {
        return new Response(JSON.stringify({ 
          error: 'VALIDATION_ERROR', 
          message: 'Title and focus_area are required for exercises' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const exerciseInsert: any = { title, focus_area };
      if (lesson_id) {
        exerciseInsert.lesson_id = lesson_id;
      }

      // Create exercise
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .insert(exerciseInsert)
        .select()
        .single();

      if (exerciseError) {
        console.error('Database error creating exercise:', exerciseError);
        return new Response(JSON.stringify({ 
          error: 'DATABASE_ERROR', 
          message: exerciseError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate a unique access code
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      let accessCode = generateCode();
      let codeData;
      
      // Ensure code is unique by retrying if collision occurs
      let attempts = 0;
      while (attempts < 5) {
        const { data: codeResult, error: codeError } = await supabase
          .from('codes')
          .insert({
            id: accessCode,
            type: 'exercise',
            target_id: exerciseData.id
          })
          .select()
          .single();

        if (!codeError) {
          codeData = codeResult;
          break;
        }

        if (codeError.code === '23505') { // Unique constraint violation
          accessCode = generateCode();
          attempts++;
        } else {
          console.error('Database error creating access code:', codeError);
          return new Response(JSON.stringify({ 
            error: 'DATABASE_ERROR', 
            message: codeError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!codeData) {
        console.error('Failed to generate unique access code after 5 attempts');
        return new Response(JSON.stringify({ 
          error: 'DATABASE_ERROR', 
          message: 'Failed to generate unique access code' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Exercise created successfully:', exerciseData.id, 'with code:', accessCode);
      return new Response(JSON.stringify({ 
        success: true, 
        exercise: exerciseData,
        code: codeData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ 
        error: 'VALIDATION_ERROR', 
        message: 'Type must be either "lesson" or "exercise"' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in lesson-handler function:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR', 
      message: error.message || 'Unexpected server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});