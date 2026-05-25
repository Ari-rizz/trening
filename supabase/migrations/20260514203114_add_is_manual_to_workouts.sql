/*
  # Add is_manual column to workouts table

  ## Summary
  Adds a boolean flag to distinguish manually entered progress entries from workouts
  logged through the normal workout flow.

  ## Changes
  - `workouts` table: new column `is_manual` (boolean, default false)
    - true = user manually added this entry via the "Manuell innlegging" flow in the Progress tab
    - false (default) = normal completed workout session

  ## Notes
  - No data loss; existing rows default to false
  - No RLS changes needed; existing policies on workouts already cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'is_manual'
  ) THEN
    ALTER TABLE workouts ADD COLUMN is_manual boolean NOT NULL DEFAULT false;
  END IF;
END $$;
