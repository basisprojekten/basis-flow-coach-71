-- Remove focus_area column from exercises table
ALTER TABLE public.exercises 
DROP COLUMN IF EXISTS focus_area;