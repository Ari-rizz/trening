/*
  # Add body_weight_logs table

  ## Summary
  Creates a new table for tracking daily body weight entries per user.

  ## New Tables
  - `body_weight_logs`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `weight_kg` (numeric, the recorded weight)
    - `logged_at` (date, the day this entry belongs to — one per user per day)
    - `created_at` (timestamptz, when the row was inserted)

  ## Constraints
  - Unique constraint on (user_id, logged_at) — max one entry per user per day
  - Index on (user_id, logged_at DESC) for fast queries

  ## Security
  - RLS enabled
  - Users can only select, insert, update their own rows
  - No delete policy (encourage editing instead)
*/

CREATE TABLE IF NOT EXISTS body_weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 999),
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, logged_at)
);

CREATE INDEX IF NOT EXISTS body_weight_logs_user_date_idx
  ON body_weight_logs (user_id, logged_at DESC);

ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight logs"
  ON body_weight_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON body_weight_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON body_weight_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
