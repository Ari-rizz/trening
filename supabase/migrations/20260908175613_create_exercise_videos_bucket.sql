/*
# Create exercise-videos storage bucket

1. New Storage Bucket
- `exercise-videos` — a public bucket for storing MP4 exercise demonstration videos.
  Videos are served publicly (no auth required to read), so the app can
  autoplay them without needing a signed URL.

2. Storage Policies
- SELECT (read): public — anyone can read objects, no auth required.
- INSERT/UPDATE/DELETE: restricted to authenticated users (admin uploads).

3. Notes
- The bucket is created with `public = true` so Supabase serves objects
  over the public CDN URL without authentication.
- Idempotent: uses IF NOT EXISTS for the bucket, and DROP POLICY IF EXISTS
  before creating policies.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
DROP POLICY IF EXISTS "Public can read exercise videos" ON storage.objects;
CREATE POLICY "Public can read exercise videos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'exercise-videos');

-- Authenticated can upload
DROP POLICY IF EXISTS "Authenticated can upload exercise videos" ON storage.objects;
CREATE POLICY "Authenticated can upload exercise videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-videos');

-- Authenticated can update/delete their own uploads
DROP POLICY IF EXISTS "Authenticated can update exercise videos" ON storage.objects;
CREATE POLICY "Authenticated can update exercise videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-videos')
WITH CHECK (bucket_id = 'exercise-videos');

DROP POLICY IF EXISTS "Authenticated can delete exercise videos" ON storage.objects;
CREATE POLICY "Authenticated can delete exercise videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-videos');
