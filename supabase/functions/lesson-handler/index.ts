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

interface MinimalCasePayload {
  role?: string;
  background?: string;
  goals?: string | null;
}

async function createSupportingCase(
  casePayload: MinimalCasePayload | undefined,
  fallbackTitle: string
): Promise<string> {
  const roleSource =
    typeof casePayload?.role === 'string' && casePayload.role.trim().length > 0
      ? casePayload.role.trim()
      : fallbackTitle.trim().length > 0
        ? fallbackTitle.trim()
        : 'Generated role';

  const backgroundSource =
    typeof casePayload?.background === 'string' && casePayload.background.trim().length > 0
      ? casePayload.background.trim()
      : 'Background pending. Update this case once documents are linked.';

  const rawGoals = casePayload?.goals ?? '';
  const goalsString = typeof rawGoals === 'string' ? rawGoals : String(rawGoals);
  const trimmedGoals = goalsString.trim();
  const goals = trimmedGoals.length > 0 ? trimmedGoals : null;

  const rawText = [
    `Role: ${roleSource}`,
    `Background: ${backgroundSource}`,
    `Goals: ${goals ?? 'None specified'}`
  ].join('\n');

  const caseTitle = `${roleSource} scenario`;

  const { data, error } = await supabase
    .from('cases')
    .insert({
      title: caseTitle,
      raw_text: rawText,
      structured_json: {
        role: roleSource,
        background: backgroundSource,
        goals
      }
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Case insert failed in lesson-handler:', error);
    throw new Error(error?.message ?? 'Unknown error while creating case');
  }

  return (data as { id: string }).id;
}

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
      const exercisePayload = body as {
        title?: string;
        focus_hint?: string | null;
        focusHint?: string | null;
        lesson_id?: string | null;
        lessonId?: string | null;
        instruction_document_id?: string | null;
        instructionDocumentId?: string | null;
        case?: MinimalCasePayload;
        protocol_stack?: string[];
        protocolStack?: string[];
        toggles?: Record<string, unknown>;
      };

      const title = exercisePayload.title?.toString().trim() ?? '';

      if (title.length === 0) {
        return json({ error: 'VALIDATION_ERROR', message: 'title is required' }, 400);
      }

      let focusHintValue: string | null = null;
      const rawFocus = exercisePayload.focus_hint ?? exercisePayload.focusHint;
      if (typeof rawFocus === 'string') {
        const trimmed = rawFocus.trim();
        focusHintValue = trimmed.length > 0 ? trimmed : null;
      } else if (rawFocus != null) {
        const trimmed = String(rawFocus).trim();
        focusHintValue = trimmed.length > 0 ? trimmed : null;
      }

      const protocolSource = exercisePayload.protocol_stack ?? exercisePayload.protocolStack;
      const protocolStack = Array.isArray(protocolSource) ? protocolSource : [];

      const toggles =
        exercisePayload.toggles && typeof exercisePayload.toggles === 'object'
          ? exercisePayload.toggles
          : {};

      const lessonId = exercisePayload.lesson_id ?? exercisePayload.lessonId ?? null;
      const instructionDocumentId =
        exercisePayload.instruction_document_id ?? exercisePayload.instructionDocumentId ?? null;

      let caseId: string;
      try {
        caseId = await createSupportingCase(exercisePayload.case, title);
      } catch (error) {
        console.error('Failed to provision case for exercise:', error);
        return json({
          error: 'DATABASE_ERROR',
          message: 'Failed to create supporting case for exercise',
          details: error instanceof Error ? error.message : error
        }, 500);
      }

      const insertPayload: Record<string, unknown> = {
        title,
        case_id: caseId,
        focus_hint: focusHintValue,
        protocols: protocolStack,
        toggles,
        lesson_id: lessonId,
        instruction_document_id: instructionDocumentId
      };

      const { data: exercise, error: exErr } = await supabase
        .from('exercises')
        .insert(insertPayload)
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
