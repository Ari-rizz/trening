/*
  # Add superset_group to workout_exercises and template_exercises

  ## Summary
  Adds a nullable integer column `superset_group` to both `workout_exercises` and
  `template_exercises` tables. Two exercises with the same non-null superset_group value
  (within the same workout/template) form a superset pair. Always exactly 2 exercises
  per group.

  ## Changes
  - `workout_exercises.superset_group` (integer, nullable) - shared group ID for superset pairs in a workout
  - `template_exercises.superset_group` (integer, nullable) - shared group ID for superset pairs in a template
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'superset_group'
  ) THEN
    ALTER TABLE workout_exercises ADD COLUMN superset_group integer DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_exercises' AND column_name = 'superset_group'
  ) THEN
    ALTER TABLE template_exercises ADD COLUMN superset_group integer DEFAULT NULL;
  END IF;
END $$;
