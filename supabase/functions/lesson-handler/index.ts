// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function generateAccessCode(prefix: 'EX' | 'LS' = 'EX') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${code}`;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

Deno.serve(async (req: Request): Promise<Response> => {
  // 1) Robust CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported' }, 405);
  }

  try {
    const body = await req.json();
    const { type } = body as { type?: 'exercise' | 'lesson' };

    if (!type) return json({ error: 'VALIDATION_ERROR', message: 'Missing type' }, 400);

    if (type === 'exercise') {
      const { title, focus_area, lesson_id } = body as { title?: string; focus_area?: string; lesson_id?: string | null };

      if (!title || !focus_area) {
        return json({ error: 'VALIDATION_ERROR', message: 'title and focus_area are required' }, 400);
      }

      // Insert exercise first
      const { data: exercise, error: exErr } = await supabase
        .from('exercises')
        .insert({ title, focus_area, ...(lesson_id ? { lesson_id } : {}) })
        .select('*')
        .single();

      if (exErr || !exercise) {
        console.error('Exercise insert failed:', exErr);
        return json({ error: 'DATABASE_ERROR', message: 'Failed to create exercise', details: exErr }, 500);
      }

      // Create unique access code with retries
      let attempts = 0;
      let codeRow: any | null = null;
      while (attempts < 6) {
        const code = generateAccessCode('EX');
        const { data, error } = await supabase
          .from('codes')
          .insert({ id: code, type: 'exercise', target_id: exercise.id })
          .select('*')
          .single();

        if (!error && data) {
          codeRow = data;
          break;
        }

        // Unique violation code in Postgres is 23505; any other error -> rollback immediately
        if (error && (error as any).code !== '23505') {
          console.error('Code insert failed (non-unique):', error);
          // rollback: delete the exercise
          await supabase.from('exercises').delete().eq('id', exercise.id);
          return json({ error: 'DATABASE_ERROR', message: 'Failed to create access code', details: error }, 500);
        }

        attempts++;
      }

      if (!codeRow) {
        console.error('Failed to generate unique access code after retries');
        await supabase.from('exercises').delete().eq('id', exercise.id);
        return json({ error: 'DATABASE_ERROR', message: 'Failed to generate unique access code' }, 500);
      }

      return json({ success: true, exercise, code: codeRow }, 201);
    }

    if (type === 'lesson') {
      const { title } = body as { title?: string };
      if (!title) return json({ error: 'VALIDATION_ERROR', message: 'title is required' }, 400);

      const { data: lesson, error: lessonErr } = await supabase
        .from('lessons')
        .insert({ title })
        .select('*')
        .single();

      if (lessonErr || !lesson) {
        console.error('Lesson insert failed:', lessonErr);
        return json({ error: 'DATABASE_ERROR', message: 'Failed to create lesson', details: lessonErr }, 500);
      }

      return json({ success: true, lesson }, 201);
    }

    return json({ error: 'INVALID_TYPE', message: 'Type must be either "exercise" or "lesson"' }, 400);
  } catch (err: any) {
    console.error('Unexpected error in lesson-handler:', err);
    return json({ error: 'INTERNAL_ERROR', message: err?.message || 'Unexpected server error' }, 500);
  }
});
