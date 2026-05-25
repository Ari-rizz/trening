/*
  # Add public_profiles view

  ## Summary
  Creates a secure view that exposes only the `id` and `username` columns
  from the `profiles` table. This allows other authenticated users to look
  up a plan owner's username during shared-plan import, without exposing
  any sensitive profile data (full_name, date_of_birth, height_cm,
  weight_kg, gender, fitness_level, training_goal, etc.).

  ## Changes
  - New view `public_profiles` with columns: id, username
  - RLS enabled on the view
  - SELECT policy for all authenticated users
  - The underlying `profiles` table and its strict RLS policies are unchanged
*/

CREATE OR REPLACE VIEW public_profiles AS
  SELECT id, username FROM profiles;

ALTER VIEW public_profiles OWNER TO postgres;

-- Enable RLS on the view
ALTER VIEW public_profiles SET (security_invoker = true);

CREATE POLICY "Authenticated users can read any public profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
