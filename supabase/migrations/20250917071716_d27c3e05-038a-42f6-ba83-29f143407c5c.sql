-- Add missing constraints and indexes to codes table

-- Add check constraint for type
ALTER TABLE public.codes ADD CONSTRAINT codes_type_check 
CHECK (type IN ('exercise', 'lesson'));

-- Create validation function for reference integrity
CREATE OR REPLACE FUNCTION validate_codes_reference()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.type = 'exercise' AND NOT EXISTS (
    SELECT 1 FROM exercises WHERE id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Invalid exercise reference: %', NEW.target_id;
  END IF;
  
  IF NEW.type = 'lesson' AND NOT EXISTS (
    SELECT 1 FROM lessons WHERE id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Invalid lesson reference: %', NEW.target_id;
  END IF;
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_codes_reference_trigger
  BEFORE INSERT OR UPDATE ON public.codes
  FOR EACH ROW EXECUTE FUNCTION validate_codes_reference();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_codes_type_target ON public.codes(type, target_id);
CREATE INDEX IF NOT EXISTS idx_codes_created_at ON public.codes(created_at DESC);