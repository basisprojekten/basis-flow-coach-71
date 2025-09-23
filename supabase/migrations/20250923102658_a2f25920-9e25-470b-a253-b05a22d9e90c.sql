-- Add instruction_document_id column to exercises table
ALTER TABLE public.exercises 
ADD COLUMN instruction_document_id UUID REFERENCES public.documents(id);

-- Add index for better query performance
CREATE INDEX idx_exercises_instruction_document_id ON public.exercises(instruction_document_id);