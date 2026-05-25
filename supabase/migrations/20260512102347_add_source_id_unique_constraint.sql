/*
  # Add unique constraint on exercises.source_id
  Required for upsert deduplication via REST API on_conflict parameter.
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_source_id_key' AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE exercises ADD CONSTRAINT exercises_source_id_key UNIQUE (source_id);
  END IF;
END $$;
