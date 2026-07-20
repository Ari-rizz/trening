/*
# Add goals, feedback, terms acceptance, cardio logs, muscle activation, notification preferences, and push subscriptions

1. New Tables
- `goals` — user fitness goals (strength PRs, bodyweight, workout frequency, custom). Columns: id, user_id, type, target_value, current_value, unit, start_date, target_date, exercise_id (nullable, for exercise-specific goals), created_at, updated_at.
- `feedback` — user-submitted suggestions and bug reports. Columns: id, user_id, type (suggestion|bug), subject, body, app_version, platform, created_at, status.
- `terms_acceptance` — records each user's acceptance of terms/privacy policy versions. Columns: id, user_id, terms_version, accepted_at.
- `cardio_logs` — cardio session logs (distance, duration, calories, pace, speed, heart rate). Columns: id, user_id, workout_id (nullable), category, distance_m, duration_s, calories, pace_s_per_km, speed_kmh, avg_hr, max_hr, created_at.
- `muscle_activation` — per-workout muscle activation records for balance analytics. Columns: id, user_id, workout_id, exercise_id, region, sets, volume_kg, intensity_score, created_at.
- `notification_preferences` — per-user notification toggles and reminder time. Columns: id, user_id, rest_timer, weight_reminder, workout_reminder, goal_reminder, reminder_time, created_at.
- `push_subscriptions` — device-agnostic push notification endpoints (FCM, APNs, Web Push). Columns: id, user_id, platform, token, endpoint, created_at, updated_at.

2. Modified Tables
- `profiles` — add `terms_accepted_at` (timestamptz), `terms_version` (text), `available_equipment` (text[]), `workout_frequency` (integer), `fitness_objective` (text) for expanded onboarding.
- `exercises` — add `cardio_type` (text) to distinguish cardio exercise subtypes (running, walking, cycling, rowing, swimming, stairmaster, elliptical, ski_erg, other). The existing `category` text column is reused as the discriminator ('strength' vs 'cardio').

3. Security
- Enable RLS on all new tables.
- Owner-scoped CRUD policies on goals, feedback (insert/select own), terms_acceptance, cardio_logs, muscle_activation, notification_preferences, push_subscriptions.
- feedback INSERT allowed for anon and authenticated (so unauthenticated users could submit, though app uses auth).

4. Notes
1. All new columns are nullable to preserve backwards compatibility.
2. `user_id` columns default to `auth.uid()` so client inserts omitting user_id still satisfy RLS.
3. Indexes added on user_id and common query columns for performance.
4. The `exercises.category` column already exists as text; we add `cardio_type` alongside it and index both.
*/

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  exercise_id uuid,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
DROP POLICY IF EXISTS "select_own_goals" ON goals;
CREATE POLICY "select_own_goals" ON goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_goals" ON goals;
CREATE POLICY "insert_own_goals" ON goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_goals" ON goals;
CREATE POLICY "update_own_goals" ON goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "delete_own_goals" ON goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- feedback
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'suggestion',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  app_version text,
  platform text,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'open'
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at desc);
DROP POLICY IF EXISTS "select_own_feedback" ON feedback;
CREATE POLICY "select_own_feedback" ON feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_feedback" ON feedback;
CREATE POLICY "insert_feedback" ON feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_feedback" ON feedback;
CREATE POLICY "update_own_feedback" ON feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- terms_acceptance
CREATE TABLE IF NOT EXISTS terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz DEFAULT now()
);
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user_id ON terms_acceptance(user_id);
DROP POLICY IF EXISTS "select_own_terms_acceptance" ON terms_acceptance;
CREATE POLICY "select_own_terms_acceptance" ON terms_acceptance FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_terms_acceptance" ON terms_acceptance;
CREATE POLICY "insert_own_terms_acceptance" ON terms_acceptance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- cardio_logs
CREATE TABLE IF NOT EXISTS cardio_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid,
  category text NOT NULL,
  distance_m numeric,
  duration_s integer,
  calories numeric,
  pace_s_per_km numeric,
  speed_kmh numeric,
  avg_hr integer,
  max_hr integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cardio_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cardio_logs_user_id ON cardio_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cardio_logs_created_at ON cardio_logs(created_at desc);
DROP POLICY IF EXISTS "select_own_cardio_logs" ON cardio_logs;
CREATE POLICY "select_own_cardio_logs" ON cardio_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cardio_logs" ON cardio_logs;
CREATE POLICY "insert_own_cardio_logs" ON cardio_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cardio_logs" ON cardio_logs;
CREATE POLICY "update_own_cardio_logs" ON cardio_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cardio_logs" ON cardio_logs;
CREATE POLICY "delete_own_cardio_logs" ON cardio_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- muscle_activation
CREATE TABLE IF NOT EXISTS muscle_activation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid,
  exercise_id uuid,
  region text NOT NULL,
  sets integer NOT NULL DEFAULT 0,
  volume_kg numeric NOT NULL DEFAULT 0,
  intensity_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE muscle_activation ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_muscle_activation_user_id ON muscle_activation(user_id);
CREATE INDEX IF NOT EXISTS idx_muscle_activation_created_at ON muscle_activation(created_at desc);
CREATE INDEX IF NOT EXISTS idx_muscle_activation_region ON muscle_activation(region);
DROP POLICY IF EXISTS "select_own_muscle_activation" ON muscle_activation;
CREATE POLICY "select_own_muscle_activation" ON muscle_activation FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_muscle_activation" ON muscle_activation;
CREATE POLICY "insert_own_muscle_activation" ON muscle_activation FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_muscle_activation" ON muscle_activation;
CREATE POLICY "update_own_muscle_activation" ON muscle_activation FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_muscle_activation" ON muscle_activation;
CREATE POLICY "delete_own_muscle_activation" ON muscle_activation FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rest_timer boolean NOT NULL DEFAULT true,
  weight_reminder boolean NOT NULL DEFAULT false,
  workout_reminder boolean NOT NULL DEFAULT false,
  goal_reminder boolean NOT NULL DEFAULT false,
  reminder_time time NOT NULL DEFAULT '18:00',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
DROP POLICY IF EXISTS "select_own_notification_preferences" ON notification_preferences;
CREATE POLICY "select_own_notification_preferences" ON notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notification_preferences" ON notification_preferences;
CREATE POLICY "insert_own_notification_preferences" ON notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notification_preferences" ON notification_preferences;
CREATE POLICY "update_own_notification_preferences" ON notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  token text,
  endpoint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
DROP POLICY IF EXISTS "select_own_push_subscriptions" ON push_subscriptions;
CREATE POLICY "select_own_push_subscriptions" ON push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_push_subscriptions" ON push_subscriptions;
CREATE POLICY "insert_own_push_subscriptions" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_push_subscriptions" ON push_subscriptions;
CREATE POLICY "update_own_push_subscriptions" ON push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_push_subscriptions" ON push_subscriptions;
CREATE POLICY "delete_own_push_subscriptions" ON push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles new columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='terms_accepted_at') THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='terms_version') THEN
    ALTER TABLE profiles ADD COLUMN terms_version text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='available_equipment') THEN
    ALTER TABLE profiles ADD COLUMN available_equipment text[] DEFAULT '{}';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='workout_frequency') THEN
    ALTER TABLE profiles ADD COLUMN workout_frequency integer;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='fitness_objective') THEN
    ALTER TABLE profiles ADD COLUMN fitness_objective text;
  END IF;
END $$;

-- exercises new column: cardio_type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exercises' AND column_name='cardio_type') THEN
    ALTER TABLE exercises ADD COLUMN cardio_type text;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_cardio_type ON exercises(cardio_type);

-- Backfill existing exercises category to 'strength' where empty/null
UPDATE exercises SET category = 'strength' WHERE category IS NULL OR category = '';