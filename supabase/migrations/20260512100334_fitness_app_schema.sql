/*
  # Fitness App Schema

  ## Overview
  Complete schema for a progressive overload fitness tracking PWA.

  ## Tables

  ### exercises
  - Stores the exercise library (seeded from free API + custom)
  - Fields: id, name, muscle_group, secondary_muscles, equipment, difficulty, instructions, gif_url, is_custom, created_by

  ### workouts
  - Represents a completed or in-progress workout session
  - Fields: id, user_id, name, date, duration_seconds, notes, is_template

  ### workout_exercises
  - Exercises within a workout, ordered
  - Fields: id, workout_id, exercise_id, order_index, notes, set_type

  ### workout_sets
  - Individual sets within a workout exercise
  - Fields: id, workout_exercise_id, set_number, reps, weight_kg, rpe, is_warmup, is_completed, duration_seconds

  ### personal_records
  - Tracks PRs per exercise
  - Fields: id, user_id, exercise_id, weight_kg, reps, one_rep_max, achieved_at

  ## Security
  - RLS enabled on all tables
  - Public read for exercises (shared library)
  - User-scoped access for workouts, sets, and PRs
*/

-- Exercises table (shared library)
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  muscle_group text NOT NULL,
  secondary_muscles text[] DEFAULT '{}',
  equipment text DEFAULT 'bodyweight',
  difficulty text DEFAULT 'beginner',
  instructions text DEFAULT '',
  gif_url text DEFAULT '',
  image_url text DEFAULT '',
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Everyone can read exercises
CREATE POLICY "Anyone can read exercises"
  ON exercises FOR SELECT
  USING (is_custom = false OR created_by = auth.uid());

-- Authenticated users can insert custom exercises
CREATE POLICY "Users can insert custom exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true AND created_by = auth.uid());

-- Users can update their own custom exercises
CREATE POLICY "Users can update own exercises"
  ON exercises FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own custom exercises
CREATE POLICY "Users can delete own exercises"
  ON exercises FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Workout',
  date timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0,
  notes text DEFAULT '',
  is_template boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  total_volume_kg numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Workout exercises (exercises within a session)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  notes text DEFAULT '',
  set_type text DEFAULT 'standard',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own workout_exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workout_exercises"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workout_exercises"
  ON workout_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workout_exercises"
  ON workout_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

-- Workout sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL DEFAULT 1,
  reps integer DEFAULT 0,
  weight_kg numeric DEFAULT 0,
  rpe numeric DEFAULT 0,
  is_warmup boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own workout_sets"
  ON workout_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workout_sets"
  ON workout_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workout_sets"
  ON workout_sets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id
      AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workout_sets"
  ON workout_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id
      AND w.user_id = auth.uid()
    )
  );

-- Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weight_kg numeric NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 1,
  one_rep_max numeric DEFAULT 0,
  achieved_at timestamptz DEFAULT now(),
  workout_id uuid REFERENCES workouts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own personal_records"
  ON personal_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal_records"
  ON personal_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal_records"
  ON personal_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal_records"
  ON personal_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
