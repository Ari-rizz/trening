/*
# Add video_url column to exercises table

1. Changes
- Add `video_url` column (text, nullable) to the `exercises` table.
  This column stores a public URL to an MP4 video file in Supabase Storage.
  When populated, the app shows a looping, muted, autoplaying video instead of the static image gallery.
  When null/empty, the existing image gallery is used as before.

2. Notes
- No RLS changes needed — the exercises table already has appropriate policies.
- The column is nullable so existing rows are unaffected.
- Idempotent: uses DO $$ ... IF NOT EXISTS ... END $$ to avoid errors on re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE exercises ADD COLUMN video_url text;
  END IF;
END $$;
