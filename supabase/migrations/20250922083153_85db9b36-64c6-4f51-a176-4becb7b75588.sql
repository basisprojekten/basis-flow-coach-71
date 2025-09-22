-- Fix validate_codes_reference to handle uuid/text comparison correctly
CREATE OR REPLACE FUNCTION public.validate_codes_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'exercise' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.exercises WHERE id = NEW.target_id::uuid
    ) THEN
      RAISE EXCEPTION 'Invalid exercise reference: %', NEW.target_id;
    END IF;
  ELSIF NEW.type = 'lesson' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.lessons WHERE id = NEW.target_id::uuid
    ) THEN
      RAISE EXCEPTION 'Invalid lesson reference: %', NEW.target_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;