-- Create enum for protocol types
CREATE TYPE protocol_type AS ENUM ('base', 'content', 'process');

-- Drop existing cases table and recreate with new structure
DROP TABLE IF EXISTS public.cases CASCADE;

CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  structured_json JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create protocols table
CREATE TABLE public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT DEFAULT NULL,
  type protocol_type NOT NULL,
  raw_text TEXT NOT NULL,
  structured_json JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for both tables
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cases
CREATE POLICY "Allow public read access to cases" 
ON public.cases 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role full access to cases" 
ON public.cases 
FOR ALL 
USING (true);

-- Create RLS policies for protocols
CREATE POLICY "Allow public read access to protocols" 
ON public.protocols 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role full access to protocols" 
ON public.protocols 
FOR ALL 
USING (true);

-- Add indexes for better performance
CREATE INDEX idx_cases_created_at ON public.cases(created_at);
CREATE INDEX idx_protocols_type ON public.protocols(type);
CREATE INDEX idx_protocols_created_at ON public.protocols(created_at);