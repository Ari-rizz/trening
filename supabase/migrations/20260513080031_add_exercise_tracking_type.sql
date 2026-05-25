/*
  # Add exercise tracking type preference per user

  1. New Tables
    - `user_exercise_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `exercise_id` (uuid, references exercises)
      - `tracking_type` (text, default 'reps_weight') - either 'reps_weight' or 'time'
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_exercise_preferences` table
    - Users can only read/write their own preferences

  3. Notes
    - Unique constraint on (user_id, exercise_id) to ensure one preference per exercise per user
    - tracking_type values: 'reps_weight' (default) or 'time'
*/

CREATE TABLE IF NOT EXISTS user_exercise_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  tracking_type text NOT NULL DEFAULT 'reps_weight',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE user_exercise_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own exercise preferences"
  ON user_exercise_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise preferences"
  ON user_exercise_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise preferences"
  ON user_exercise_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise preferences"
  ON user_exercise_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
