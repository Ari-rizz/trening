/*
  # Add intro_tour_completed to profiles

  1. Changes
    - Adds `intro_tour_completed` boolean column to `profiles` table (default false)
    - Existing users will have it set to false so they see the tour next login
    - No data loss — purely additive change
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'intro_tour_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN intro_tour_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;
