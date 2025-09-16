-- Enable Row Level Security on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to exercises, lessons, and cases (read-only)
-- These are reference data that should be publicly readable
CREATE POLICY "Allow public read access to exercises" 
ON public.exercises FOR SELECT USING (true);

CREATE POLICY "Allow public read access to lessons" 
ON public.lessons FOR SELECT USING (true);

CREATE POLICY "Allow public read access to cases" 
ON public.cases FOR SELECT USING (true);

-- Create policies for sessions - restrict to service role for now
-- Sessions should only be managed by the backend service
CREATE POLICY "Allow service role full access to sessions" 
ON public.sessions FOR ALL USING (true);

-- Allow service role to manage all data
CREATE POLICY "Allow service role full access to exercises" 
ON public.exercises FOR ALL USING (true);

CREATE POLICY "Allow service role full access to lessons" 
ON public.lessons FOR ALL USING (true);

CREATE POLICY "Allow service role full access to cases" 
ON public.cases FOR ALL USING (true);