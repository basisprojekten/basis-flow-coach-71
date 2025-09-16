-- Create sessions table for training session state
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('exercise', 'lesson', 'transcript')),
  exercise_id TEXT,
  lesson_id TEXT,
  student_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  state JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Create exercises table for exercise definitions
CREATE TABLE public.exercises (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  case_id TEXT NOT NULL,
  protocols JSONB NOT NULL DEFAULT '[]'::jsonb,
  toggles JSONB NOT NULL DEFAULT '{}'::jsonb,
  focus_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table for lesson definitions
CREATE TABLE public.lessons (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  exercise_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cases table for roleplay case definitions
CREATE TABLE public.cases (
  id TEXT NOT NULL PRIMARY KEY,
  role TEXT NOT NULL,
  background TEXT NOT NULL,
  goals TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX idx_sessions_last_activity ON public.sessions(last_activity_at);
CREATE INDEX idx_exercises_case_id ON public.exercises(case_id);

-- Insert default case for concerned parent scenario
INSERT INTO public.cases (id, role, background, goals) VALUES (
  'concerned-parent-case',
  'Concerned Parent',
  'A parent worried about their child''s academic progress and wants to discuss intervention strategies',
  'Understand available resources, get guidance on supporting child at home, establish clear next steps'
);

-- Insert default exercise for BASIS training
INSERT INTO public.exercises (id, title, case_id, protocols, toggles, focus_hint) VALUES (
  'demo-001',
  'Confidentiality Discussion Training',
  'concerned-parent-case',
  '["basis-v1"]'::jsonb,
  '{"feedforward": true, "iterative": true, "mode": "text", "skipRoleplayForGlobalFeedback": false}'::jsonb,
  'Practice maintaining professional boundaries while showing empathy'
);