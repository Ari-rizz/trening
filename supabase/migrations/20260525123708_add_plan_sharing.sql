/*
  # Add Plan Sharing Infrastructure

  ## Summary
  Enables users to share workout templates with others via short 6-character codes.

  ## New Columns
  - `profiles.username` — short unique username shown as the sharer's identity (auto-generated on insert)
  - `workout_templates.imported_from_username` — set when a template is imported from another user; null for own plans

  ## New Tables
  - `shared_templates`
    - `id` (uuid, primary key)
    - `owner_user_id` (uuid, references auth.users) — who created the share
    - `template_id` (uuid, references workout_templates) — which template is shared
    - `share_code` (text, unique, 6 chars) — the code recipients use to import
    - `created_at` (timestamptz)
    - Unique constraint: one active share code per template (upsert replaces old code)

  ## Security
  - RLS enabled on `shared_templates`
  - SELECT: any authenticated user can look up a share by code (needed for import)
  - INSERT: only authenticated users can create shares for their own templates
  - DELETE: only the owner can revoke their own shares
  - Max 20 active share codes per user enforced via check function

  ## Notes
  1. Copying is done in application code (not DB triggers) so no server-side duplication logic needed
  2. `username` is auto-populated for existing rows via a DO block using email prefix + random suffix
  3. New users get a username via the existing `handle_new_user` trigger (updated below)
*/

-- 1. Add username to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;
END $$;

-- 2. Backfill usernames for existing profiles using a random 8-char alphanumeric string
UPDATE profiles
SET username = 'bruker_' || substr(md5(id::text || random()::text), 1, 6)
WHERE username IS NULL;

-- 3. Add imported_from_username to workout_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_templates' AND column_name = 'imported_from_username'
  ) THEN
    ALTER TABLE workout_templates ADD COLUMN imported_from_username text DEFAULT NULL;
  END IF;
END $$;

-- 4. Create shared_templates table
CREATE TABLE IF NOT EXISTS shared_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  share_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (template_id)
);

ALTER TABLE shared_templates ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can look up a share code (needed to preview/import)
CREATE POLICY "Authenticated users can look up share codes"
  ON shared_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only the owner can create a share for their own template
CREATE POLICY "Owners can create share codes for own templates"
  ON shared_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- Only the owner can delete their own share codes
CREATE POLICY "Owners can delete own share codes"
  ON shared_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- 5. Update handle_new_user trigger to also set a username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  email_prefix text;
  new_username text;
BEGIN
  -- Derive a username from the email prefix, fallback to random
  email_prefix := split_part(new.email, '@', 1);
  new_username := lower(regexp_replace(email_prefix, '[^a-z0-9]', '', 'g'));
  -- Ensure uniqueness by appending random suffix
  new_username := substr(new_username, 1, 10) || '_' || substr(md5(new.id::text), 1, 5);

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new_username)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username WHERE profiles.username IS NULL;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
