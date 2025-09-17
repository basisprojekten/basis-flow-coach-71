-- Fix security issue: Set search_path for validation function
CREATE OR REPLACE FUNCTION validate_codes_reference()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.type = 'exercise' AND NOT EXISTS (
    SELECT 1 FROM public.exercises WHERE id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Invalid exercise reference: %', NEW.target_id;
  END IF;
  
  IF NEW.type = 'lesson' AND NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Invalid lesson reference: %', NEW.target_id;
  END IF;
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;