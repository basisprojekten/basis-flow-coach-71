import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    if (type === 'exercise') {
      const { title, focus_area, lesson_id } = requestBody;

      if (!title || !focus_area) {
        return new Response(JSON.stringify({ 
          error: 'VALIDATION_ERROR', 
          message: 'Title and focus_area are required for exercises' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create exercise
      const exerciseData: any = { title, focus_area };
      if (lesson_id) {
        exerciseData.lesson_id = lesson_id;
      }

      const { data: newExercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      if (exerciseError) {
        console.error('Failed to create exercise:', exerciseError);
        return new Response(JSON.stringify({ 
          error: 'DATABASE_ERROR', 
          message: exerciseError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate unique 6-character access code
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      let accessCode = generateCode();
      let attempts = 0;
      let newCode = null;

      // Try to create unique access code with retries
      while (attempts < 5) {
        const { data: codeResult, error: codeError } = await supabase
          .from('codes')
          .insert({
            id: accessCode,
            type: 'exercise',
            target_id: newExercise.id
          })
          .select()
          .single();

        if (!codeError) {
          newCode = codeResult;
          break;
        }

        if (codeError.code === '23505') { // Unique constraint violation
          accessCode = generateCode();
          attempts++;
        } else {
          console.error('Failed to create access code:', codeError);
          
          // Rollback: Delete the exercise that was just created
          await supabase
            .from('exercises')
            .delete()
            .eq('id', newExercise.id);

          return new Response(JSON.stringify({ 
            error: 'DATABASE_ERROR', 
            message: 'Failed to create access code' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!newCode) {
        console.error('Failed to generate unique access code after 5 attempts');
        
        // Rollback: Delete the exercise that was just created
        await supabase
          .from('exercises')
          .delete()
          .eq('id', newExercise.id);

        return new Response(JSON.stringify({ 
          error: 'DATABASE_ERROR', 
          message: 'Failed to generate unique access code after multiple attempts' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Exercise created successfully:', newExercise.id, 'with code:', accessCode);
      return new Response(JSON.stringify({ 
        success: true, 
        newExercise,
        newCode
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'lesson') {
      const { title } = requestBody;

      if (!title) {
        return new Response(JSON.stringify({ 
          error: 'VALIDATION_ERROR', 
          message: 'Title is required for lessons' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: newLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({ title })
        .select()
        .single();

      if (lessonError) {
        console.error('Failed to create lesson:', lessonError);
        return new Response(JSON.stringify({ 
          error: 'DATABASE_ERROR', 
          message: lessonError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Lesson created successfully:', newLesson.id);
      return new Response(JSON.stringify({ 
        success: true, 
        newLesson
      }), {
        status: 201,
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
    console.error('Unexpected error in lesson-handler function:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR', 
      message: error.message || 'Unexpected server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});