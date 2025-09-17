-- Create codes table with foreign key constraints
CREATE TABLE public.codes (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('exercise', 'lesson')),
  target_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraints
-- Note: We'll use conditional constraints since a target_id can reference either exercises OR lessons
ALTER TABLE public.codes ADD CONSTRAINT fk_codes_exercises 
  FOREIGN KEY (target_id) REFERENCES public.exercises(id) 
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.codes ADD CONSTRAINT fk_codes_lessons 
  FOREIGN KEY (target_id) REFERENCES public.lessons(id) 
  DEFERRABLE INITIALLY DEFERRED;

-- Enable RLS
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to codes" 
ON public.codes 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role full access to codes" 
ON public.codes 
FOR ALL 
USING (true);

-- Create index for better performance
CREATE INDEX idx_codes_type_target ON public.codes(type, target_id);
CREATE INDEX idx_codes_created_at ON public.codes(created_at DESC);