-- Remove all client-facing storage policies on the exercise-videos bucket.
-- The bucket stays public=true so direct CDN URLs still serve videos for playback.
-- No app code uses the Storage API to list/upload/update/delete — videos are
-- referenced purely by URL — so removing these policies does not break any flow.
-- Uploads and management of video files happen through the Supabase dashboard
-- or service-role scripts, not through the client.

DROP POLICY IF EXISTS "Public can read exercise videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload exercise videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update exercise videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete exercise videos" ON storage.objects;
