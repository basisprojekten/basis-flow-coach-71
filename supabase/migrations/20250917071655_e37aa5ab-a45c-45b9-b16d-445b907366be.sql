-- Check if constraints exist and add missing ones
DO $$ 
BEGIN
  -- Add check constraint for type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'codes_type_check'
  ) THEN
    ALTER TABLE public.codes ADD CONSTRAINT codes_type_check 
    CHECK (type IN ('exercise', 'lesson'));
  END IF;

  -- Add foreign key to exercises if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_codes_exercises'
  ) THEN
    -- First, let's make this more flexible since target_id can reference either table
    -- We'll add a constraint that checks the combination is valid
    CREATE OR REPLACE FUNCTION validate_codes_reference()
    RETURNS TRIGGER AS $$
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
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER validate_codes_reference_trigger
      BEFORE INSERT OR UPDATE ON public.codes
      FOR EACH ROW EXECUTE FUNCTION validate_codes_reference();
  END IF;

  -- Add indexes if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_codes_type_target'
  ) THEN
    CREATE INDEX idx_codes_type_target ON public.codes(type, target_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_codes_created_at'
  ) THEN
    CREATE INDEX idx_codes_created_at ON public.codes(created_at DESC);
  END IF;
END $$;