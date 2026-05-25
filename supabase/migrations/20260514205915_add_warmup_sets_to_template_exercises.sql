/*
  # Add warmup_sets to template_exercises

  ## Summary
  Adds a column to template_exercises to store the number of warmup sets
  configured for each exercise in a workout plan/template.

  ## Changes
  - `template_exercises` table: new column `warmup_sets` (integer, default 0)
    - Stores how many warmup sets the user wants before their working sets
    - When starting a workout from a template, warmup sets are pre-populated
      at approximately 50% of the last session's best weight

  ## Notes
  - No data loss; existing rows default to 0 (no warmup sets)
  - No RLS changes needed; existing policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_exercises' AND column_name = 'warmup_sets'
  ) THEN
    ALTER TABLE template_exercises ADD COLUMN warmup_sets integer NOT NULL DEFAULT 0;
  END IF;
END $$;
