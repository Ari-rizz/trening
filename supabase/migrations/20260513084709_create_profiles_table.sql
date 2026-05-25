/*
  # Create profiles table for user onboarding data

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text) - User's display name
      - `date_of_birth` (date) - User's birth date
      - `height_cm` (numeric) - Height in centimeters (optional)
      - `weight_kg` (numeric) - Weight in kilograms (optional)
      - `gender` (text) - User's gender (optional)
      - `fitness_level` (text) - beginner/intermediate/advanced (optional)
      - `training_goal` (text) - strength/hypertrophy/endurance (optional)
      - `onboarding_completed` (boolean) - Whether user finished onboarding
      - `created_at` (timestamptz) - Record creation time

  2. Security
    - Enable RLS on `profiles` table
    - Users can only read their own profile
    - Users can only update their own profile
    - Users can insert their own profile (fallback if trigger fails)

  3. Trigger
    - Automatically creates a profile row when a new user signs up
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  date_of_birth date,
  height_cm numeric,
  weight_kg numeric,
  gender text,
  fitness_level text,
  training_goal text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
