// Supabase Edge Function: exercises
// Handles exercise creation, retrieval, and listing for BASIS teacher workflows

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type ExerciseToggles = Record<string, unknown>;

interface ExerciseCasePayload {
  role: string;
  background: string;
  goals?: string | null;
}

interface ExercisesRequestBody {
  action: 'create' | 'list' | 'get';
  title?: string;
  protocolStack?: string[];
  case?: ExerciseCasePayload;
  toggles?: ExerciseToggles;
  focusHint?: string;
  exerciseId?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status,
  });
}

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

function generateExerciseId(): string {
  return `ex_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
}

function generateDisplayCode(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

async function insertCase(caseData: ExerciseCasePayload) {
  const caseId = `case_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const { data, error } = await supabase
    .from('cases')
    .insert({
      id: caseId,
      role: caseData.role,
      background: caseData.background,
      goals: caseData.goals || null
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Case insertion failed:', error);
    throw new Error(`Failed to create case: ${error.message}`);
  }

  return { caseId, record: data };
}

async function insertExercise(payload: {
  id: string;
  title: string;
  caseId: string;
  protocolStack?: string[];
  toggles?: ExerciseToggles;
  focusHint?: string;
}) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      id: payload.id,
      title: payload.title,
      case_id: payload.caseId,
      protocols: payload.protocolStack ?? [],
      toggles: payload.toggles ?? {},
      focus_hint: payload.focusHint ?? null
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Exercise insertion failed:', error);
    throw new Error(`Failed to create exercise: ${error.message}`);
  }

  return data;
}

async function upsertExerciseCode(exerciseId: string) {
  const displayCode = generateDisplayCode('EX');
  const { data, error } = await supabase
    .from('codes')
    .insert({
      id: displayCode,
      type: 'exercise',
      target_id: exerciseId
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Exercise code creation failed:', error);
    throw new Error(`Failed to create exercise code: ${error.message}`);
  }

  return data;
}

async function fetchExerciseWithCode(exerciseId: string) {
  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .maybeSingle();

  if (exerciseError) {
    throw new Error(`Failed to fetch exercise: ${exerciseError.message}`);
  }

  if (!exercise) {
    return null;
  }

  const { data: code } = await supabase
    .from('codes')
    .select('id')
    .eq('type', 'exercise')
    .eq('target_id', exercise.id)
    .maybeSingle();

  return {
    id: exercise.id,
    code: code?.id ?? null,
    exercise
  };
}

async function handleCreate(body: ExercisesRequestBody) {
  const { title, protocolStack, case: caseData, toggles, focusHint } = body;

  if (!title || !caseData?.role || !caseData?.background) {
    return jsonResponse({
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'title, case.role, and case.background are required'
    }, 400);
  }

  const exerciseId = generateExerciseId();

  const { caseId } = await insertCase(caseData);
  const exerciseRecord = await insertExercise({
    id: exerciseId,
    title,
    caseId,
    protocolStack,
    toggles,
    focusHint
  });
  const accessCode = await upsertExerciseCode(exerciseId);

  return jsonResponse({
    id: exerciseRecord.id,
    code: accessCode.id,
    exercise: exerciseRecord,
    accessCode
  });
}

async function handleList() {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to list exercises:', error);
    return jsonResponse({
      error: 'DATABASE_ERROR',
      message: 'Unable to list exercises'
    }, 500);
  }

  if (!exercises || exercises.length === 0) {
    return jsonResponse([]);
  }

  const { data: codes, error: codeError } = await supabase
    .from('codes')
    .select('id, target_id')
    .eq('type', 'exercise');

  if (codeError) {
    console.warn('⚠️ Failed to fetch exercise codes:', codeError);
  }

  const codeMap = new Map<string, string>();
  for (const code of codes ?? []) {
    if ((code as any).target_id) {
      codeMap.set((code as any).target_id, (code as any).id);
    }
  }

  const payload = exercises.map((exercise) => ({
    id: exercise.id,
    code: codeMap.get(exercise.id) ?? null,
    exercise
  }));

  return jsonResponse(payload);
}

async function handleGet(body: ExercisesRequestBody) {
  const { exerciseId } = body;

  if (!exerciseId) {
    return jsonResponse({
      error: 'MISSING_EXERCISE_ID',
      message: 'exerciseId is required'
    }, 400);
  }

  let targetId = exerciseId;
  let directLookup = await fetchExerciseWithCode(targetId);

  if (!directLookup) {
    const { data: codeRecord, error: codeLookupError } = await supabase
      .from('codes')
      .select('target_id, id')
      .eq('type', 'exercise')
      .eq('id', exerciseId)
      .maybeSingle();

    if (codeLookupError) {
      console.error('❌ Failed to resolve exercise by code:', codeLookupError);
      return jsonResponse({
        error: 'INVALID_EXERCISE_CODE',
        message: 'Unable to resolve exercise from provided code'
      }, 400);
    }

    if (!(codeRecord as any)?.target_id) {
      return jsonResponse({
        error: 'EXERCISE_NOT_FOUND',
        message: 'Exercise not found for provided identifier'
      }, 404);
    }

    targetId = (codeRecord as any).target_id;
    directLookup = await fetchExerciseWithCode(targetId);
  }

  if (!directLookup) {
    return jsonResponse({
      error: 'EXERCISE_NOT_FOUND',
      message: 'Exercise not found'
    }, 404);
  }

  return jsonResponse(directLookup);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is supported'
    }, 405);
  }

  try {
    const body = await req.json() as ExercisesRequestBody;
    const { action } = body;

    console.log(`📥 Exercises function invoked with action: ${action}`);

    switch (action) {
      case 'create':
        return await handleCreate(body);
      case 'list':
        return await handleList();
      case 'get':
        return await handleGet(body);
      default:
        return jsonResponse({
          error: 'INVALID_ACTION',
          message: `Unsupported action: ${action}`
        }, 400);
    }
  } catch (error) {
    console.error('❌ Unexpected error in exercises function:', error);
    return jsonResponse({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
