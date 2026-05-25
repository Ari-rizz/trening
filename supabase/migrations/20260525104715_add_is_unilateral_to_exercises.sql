/*
  # Add is_unilateral flag to template_exercises and workout_exercises

  ## Summary
  Adds a boolean flag to track whether an exercise is performed unilaterally
  (one arm/leg at a time) vs bilaterally (both sides together).

  ## Changes

  ### Modified Tables

  1. `template_exercises`
     - `is_unilateral` (boolean, default false) - marks the exercise as unilateral in a plan

  2. `workout_exercises`
     - `is_unilateral` (boolean, default false) - carries the flag into active/completed workouts

  ## Notes
  - The flag is set per-plan (on template_exercises), not on the exercise definition itself
  - It is copied into workout_exercises when a workout starts so history reflects how the exercise was performed
  - Default is false (bilateral) for all existing and new rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_exercises' AND column_name = 'is_unilateral'
  ) THEN
    ALTER TABLE template_exercises ADD COLUMN is_unilateral boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'is_unilateral'
  ) THEN
    ALTER TABLE workout_exercises ADD COLUMN is_unilateral boolean NOT NULL DEFAULT false;
  END IF;
END $$;
