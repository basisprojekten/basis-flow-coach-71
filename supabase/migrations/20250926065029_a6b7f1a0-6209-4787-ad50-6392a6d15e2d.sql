-- Create model_configurations table for storing AI model settings
CREATE TABLE public.model_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier text NOT NULL UNIQUE,
  model_name text NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for model configurations
CREATE POLICY "Allow public read access to model_configurations" 
ON public.model_configurations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role full access to model_configurations" 
ON public.model_configurations 
FOR ALL 
USING (true);

-- Insert default model configurations
INSERT INTO public.model_configurations (tier, model_name, label) VALUES
('INTERACTIVE', 'gpt-4o-mini', 'Snabb interaktiv modell'),
('ANALYTICAL', 'gpt-4o', 'Analytisk modell');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_model_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_model_configurations_updated_at
  BEFORE UPDATE ON public.model_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_model_configurations_updated_at();