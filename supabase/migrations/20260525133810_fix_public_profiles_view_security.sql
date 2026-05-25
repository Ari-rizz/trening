/*
  # Fix public_profiles view — restrict to username only

  ## Summary
  Removes the overly broad SELECT policy added in the previous migration
  (which exposed all columns of profiles to any authenticated user).
  Replaces it with a SECURITY DEFINER function-based view approach:
  the view runs with elevated privileges but only selects id + username,
  so callers can never reach other columns through it.

  ## Changes
  - DROP the broad "Authenticated users can read any public profile" policy
  - Recreate public_profiles as a SECURITY DEFINER view owned by postgres,
    so it bypasses RLS on profiles while only projecting id and username
*/

-- Remove the overly broad policy added by the previous migration
DROP POLICY IF EXISTS "Authenticated users can read any public profile" ON profiles;

-- Drop and recreate the view with SECURITY DEFINER so it bypasses the
-- strict profiles RLS while exposing only id and username.
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles
  WITH (security_invoker = false)
AS
  SELECT id, username FROM profiles;

-- The view owner (postgres / service role) has full access to profiles,
-- so the view can read all rows. Callers only ever get id + username.
GRANT SELECT ON public_profiles TO authenticated;
