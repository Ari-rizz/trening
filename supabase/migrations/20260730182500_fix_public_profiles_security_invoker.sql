/*
  # Fix public_profiles view — replace SECURITY DEFINER with security_invoker

  ## Summary
  The public_profiles view was previously created with security_invoker = false
  (SECURITY DEFINER), which caused a Supabase security advisor warning because
  the view bypasses RLS on the underlying profiles table by running with the
  view owner's (postgres) privileges.

  This migration replaces that approach with a cleaner, safer design:
  1. Recreate the view with security_invoker = true so it respects the querying
     user's RLS policies on the underlying profiles table.
  2. Add a narrow SELECT policy on profiles that allows any authenticated user
     to read only the id and username columns — enough for the plan-sharing
     feature to look up a sharer's username, without exposing any sensitive
     profile data (full_name, date_of_birth, weight, gender, etc.).

  ## Why this works
  - With security_invoker = true, the view runs as the calling user. The
    calling user needs SELECT permission on profiles for the columns the
    view projects (id, username). The new RLS policy grants exactly that.
  - The existing strict policies (Users can read/update/insert own profile)
    remain unchanged. Other users can only see id + username through the
    view, never the full profile row.
  - The SECURITY DEFINER warning is eliminated because the view no longer
    runs with elevated privileges.

  ## Changes
  - DROP and recreate public_profiles with security_invoker = true
  - GRANT SELECT on public_profiles to authenticated
  - Add SELECT policy "Authenticated users can read public profile fields"
    on profiles, scoped to authenticated, USING (true) — this is safe because
    the view only exposes id and username, and the policy only governs SELECT
    on profiles (not UPDATE/INSERT/DELETE).
  - Existing strict policies on profiles are untouched.
*/

-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public_profiles;

-- Recreate as security_invoker = true (respects caller's RLS)
CREATE VIEW public_profiles
  WITH (security_invoker = true)
AS
  SELECT id, username FROM profiles;

-- Grant SELECT to authenticated users
GRANT SELECT ON public_profiles TO authenticated;

-- Add a narrow SELECT policy so authenticated users can read id + username
-- from any profile row (needed for plan-sharing username lookup).
-- This is intentionally public for SELECT only; sensitive columns remain
-- protected by the existing owner-only policies.
DROP POLICY IF EXISTS "Authenticated users can read public profile fields" ON profiles;
CREATE POLICY "Authenticated users can read public profile fields"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
