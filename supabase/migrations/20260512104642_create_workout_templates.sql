/*
  # Create workout templates tables

  1. New Tables
    - `workout_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - template name e.g. "Push Day", "Leg Day"
      - `description` (text) - optional description
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `template_exercises`
      - `id` (uuid, primary key)
      - `template_id` (uuid, references workout_templates)
      - `exercise_id` (uuid, references exercises)
      - `order_index` (integer) - order within template
      - `target_sets` (integer) - planned number of sets
      - `target_reps` (integer) - planned reps per set
      - `target_weight_kg` (numeric) - planned weight
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only CRUD their own templates
*/

CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates"
  ON workout_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON workout_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON workout_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON workout_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  target_sets integer DEFAULT 3,
  target_reps integer DEFAULT 10,
  target_weight_kg numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own template exercises"
  ON template_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_exercises.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own template exercises"
  ON template_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_exercises.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own template exercises"
  ON template_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_exercises.template_id
      AND workout_templates.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_exercises.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own template exercises"
  ON template_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_exercises.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);
