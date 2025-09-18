-- Migration: allow_exercise_specific_access_codes
-- Purpose: enable codes table to reference either lessons or exercises with strong integrity guarantees

-- Remove trigger and validation function to prepare for structural changes
DROP TRIGGER IF EXISTS validate_codes_reference_trigger ON public.codes;
DROP FUNCTION IF EXISTS validate_codes_reference();

-- Rename target_id to lesson_id and allow it to be nullable so codes can reference exercises instead
ALTER TABLE public.codes RENAME COLUMN target_id TO lesson_id;
ALTER TABLE public.codes ALTER COLUMN lesson_id DROP NOT NULL;

-- Add new nullable exercise_id column
ALTER TABLE public.codes ADD COLUMN exercise_id text;

-- Drop outdated foreign key constraints that referenced the old column
ALTER TABLE public.codes DROP CONSTRAINT IF EXISTS fk_codes_exercises;
ALTER TABLE public.codes DROP CONSTRAINT IF EXISTS fk_codes_lessons;

-- Rehome existing exercise codes into the correct column
UPDATE public.codes
SET exercise_id = lesson_id,
    lesson_id = NULL
WHERE type = 'exercise';

-- Recreate foreign key constraints for the new structure
ALTER TABLE public.codes ADD CONSTRAINT fk_codes_lessons
  FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.codes ADD CONSTRAINT fk_codes_exercises
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
  DEFERRABLE INITIALLY DEFERRED;

-- Preserve the expected domain for type regardless of historic migrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'codes_type_check'
  ) THEN
    ALTER TABLE public.codes ADD CONSTRAINT codes_type_check
      CHECK (type IN ('exercise', 'lesson'));
  END IF;
END;
$$;

-- Enforce that exactly one of lesson_id or exercise_id is present
ALTER TABLE public.codes ADD CONSTRAINT codes_target_reference_check
CHECK (
  (lesson_id IS NOT NULL AND exercise_id IS NULL)
  OR
  (lesson_id IS NULL AND exercise_id IS NOT NULL)
);

-- Refresh supporting indexes
DROP INDEX IF EXISTS idx_codes_type_target;
CREATE INDEX idx_codes_type_lesson ON public.codes(type, lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX idx_codes_type_exercise ON public.codes(type, exercise_id) WHERE exercise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_codes_created_at ON public.codes(created_at DESC);

-- Recreate validation function with updated logic and hardened search_path
CREATE OR REPLACE FUNCTION validate_codes_reference()
RETURNS TRIGGER AS $func$
BEGIN
  IF (NEW.lesson_id IS NULL AND NEW.exercise_id IS NULL) OR (NEW.lesson_id IS NOT NULL AND NEW.exercise_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one of lesson_id or exercise_id must be provided.';
  END IF;

  IF NEW.type = 'exercise' THEN
    IF NEW.exercise_id IS NULL THEN
      RAISE EXCEPTION 'Exercise codes must include exercise_id.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = NEW.exercise_id) THEN
      RAISE EXCEPTION 'Invalid exercise reference: %', NEW.exercise_id;
    END IF;
  ELSIF NEW.type = 'lesson' THEN
    IF NEW.lesson_id IS NULL THEN
      RAISE EXCEPTION 'Lesson codes must include lesson_id.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = NEW.lesson_id) THEN
      RAISE EXCEPTION 'Invalid lesson reference: %', NEW.lesson_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid code type: %', NEW.type;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Reinstate trigger with the refreshed validation function
CREATE TRIGGER validate_codes_reference_trigger
  BEFORE INSERT OR UPDATE ON public.codes
  FOR EACH ROW EXECUTE FUNCTION validate_codes_reference();
