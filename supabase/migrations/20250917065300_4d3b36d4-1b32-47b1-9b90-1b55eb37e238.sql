-- Create codes table to store generated codes for exercises and lessons
CREATE TABLE public.codes (
  id TEXT PRIMARY KEY,                -- e.g. "EX-ABC123" or "LS-XYZ789"
  type TEXT NOT NULL,                 -- "exercise" | "lesson"
  target_id TEXT NOT NULL,            -- references exercises.id or lessons.id
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to codes (so anyone with a code can use it)
CREATE POLICY "Allow public read access to codes" 
ON public.codes 
FOR SELECT 
USING (true);

-- Allow service role full access to codes
CREATE POLICY "Allow service role full access to codes" 
ON public.codes 
FOR ALL 
USING (true);