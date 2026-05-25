/*
  # Add extra fields to exercises table

  ## Overview
  Extends the exercises table to hold all fields from the free-exercise-db dataset.

  ## Changes to exercises table
  - `source_id` (text) - Original exercise ID from the dataset (e.g. "Alternate_Incline_Dumbbell_Curl"), used for upsert deduplication
  - `body_part` (text) - Body part category from the dataset (e.g. "upper arms", "chest")
  - `force` (text) - Movement force type: push, pull, static, or null
  - `mechanic` (text) - Compound or isolation
  - `category` (text) - Exercise category: strength, cardio, stretching, plyometrics, etc.
  - `images` (text[]) - Array of relative image paths from the dataset
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE exercises ADD COLUMN source_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'body_part'
  ) THEN
    ALTER TABLE exercises ADD COLUMN body_part text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'force'
  ) THEN
    ALTER TABLE exercises ADD COLUMN force text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'mechanic'
  ) THEN
    ALTER TABLE exercises ADD COLUMN mechanic text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'category'
  ) THEN
    ALTER TABLE exercises ADD COLUMN category text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'images'
  ) THEN
    ALTER TABLE exercises ADD COLUMN images text[] DEFAULT '{}';
  END IF;
END $$;

-- Index for source_id lookups (used during upsert/dedup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_source_id ON exercises(source_id) WHERE source_id IS NOT NULL;
