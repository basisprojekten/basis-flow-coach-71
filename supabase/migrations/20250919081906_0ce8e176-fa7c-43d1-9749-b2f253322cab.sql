-- Educational Platform Database Schema (Fixed)
-- This migration creates the foundational architecture for lessons, exercises, documents, and their relationships

-- Drop existing tables if they exist (to ensure clean slate)
DROP TABLE IF EXISTS public.exercise_documents CASCADE;
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;

-- Create lessons table
CREATE TABLE public.lessons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    title TEXT NOT NULL
);

-- Create exercises table
CREATE TABLE public.exercises (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    focus_area TEXT NOT NULL
);

-- Create documents table
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('case', 'protocol'))
);

-- Create exercise_documents join table for many-to-many relationship
CREATE TABLE public.exercise_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(exercise_id, document_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (suitable for educational platform)
CREATE POLICY "Allow public read access to lessons" 
ON public.lessons 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to exercises" 
ON public.exercises 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to documents" 
ON public.documents 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to exercise_documents" 
ON public.exercise_documents 
FOR SELECT 
USING (true);

-- Service role policies for full access (for backend operations)
CREATE POLICY "Allow service role full access to lessons" 
ON public.lessons 
FOR ALL 
USING (true);

CREATE POLICY "Allow service role full access to exercises" 
ON public.exercises 
FOR ALL 
USING (true);

CREATE POLICY "Allow service role full access to documents" 
ON public.documents 
FOR ALL 
USING (true);

CREATE POLICY "Allow service role full access to exercise_documents" 
ON public.exercise_documents 
FOR ALL 
USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_exercises_lesson_id ON public.exercises(lesson_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_exercise_documents_exercise_id ON public.exercise_documents(exercise_id);
CREATE INDEX idx_exercise_documents_document_id ON public.exercise_documents(document_id);