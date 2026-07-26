/*
# Add tracked_exercises to profiles

1. Modified Tables
- `profiles`
  - Add `tracked_exercises` column: an array of exercise IDs (UUIDs) that the user has pinned for quick progress tracking on the Progress tab. Defaults to an empty array.
  - This is a single column addition; no new tables, no RLS policy changes needed (profiles already has owner-scoped RLS).
2. Security
- No changes to existing RLS policies. The profiles table already enforces owner-scoped CRUD via auth.uid() = id.
3. Important Notes
- The column is nullable-safe and defaults to an empty array so existing rows and new rows without a selection work without extra logic.
- The frontend will read/write this array via the existing profiles update flow.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tracked_exercises uuid[] DEFAULT '{}';
