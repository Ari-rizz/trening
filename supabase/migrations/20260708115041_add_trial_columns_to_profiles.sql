/*
  # Add trial period columns to profiles

  ## Summary
  Adds opt-in free trial tracking to the profiles table. Users can start a single
  30-day free trial without providing payment details. The trial is recorded here
  so it can never be reused.

  ## Changes to existing tables

  ### profiles
  - `trial_starts_at` (timestamptz, nullable) — set when the user explicitly starts
    their free trial. Null means they have not yet activated it.
  - `trial_ends_at` (timestamptz, nullable) — set to trial_starts_at + 30 days at
    the same time. The app gates access whenever now() > trial_ends_at.

  ## Security
  - No new RLS policies needed: the existing profiles policies already cover SELECT
    and UPDATE for authenticated users on their own row.

  ## Notes
  - Both columns are nullable so existing users are unaffected; they will see the
    paywall and can choose to start the trial or subscribe directly.
  - Idempotent: uses DO $$ block to add columns only when they are missing.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'trial_starts_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_starts_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'trial_ends_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_ends_at timestamptz DEFAULT NULL;
  END IF;
END $$;
