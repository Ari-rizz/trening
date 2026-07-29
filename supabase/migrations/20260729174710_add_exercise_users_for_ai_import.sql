/*
# Add exercise_users join table for AI-powered import

## Purpose
When a user imports an Excel/CSV file and the AI creates a new private
exercise (is_custom = true, created_by = <user>), we need to track which
users have imported that exercise so that:
  1. Other users who import the same exercise name can see/resolve it
  2. Once 5+ distinct users have imported the same private exercise it
     is automatically promoted to public (is_custom = false).

## New Tables
- `exercise_users`
  - `id` (uuid, primary key)
  - `exercise_id` (uuid, references exercises, cascade delete)
  - `user_id` (uuid, references auth.users, cascade delete)
  - `created_at` (timestamptz, default now())
  - Unique constraint on (exercise_id, user_id) so each user is counted once per exercise.

## Modified Tables
- `exercises` — no column changes. RLS SELECT policy is updated so that
  a custom exercise is visible to its creator OR to any user who has a
  row in `exercise_users` for that exercise.

## Security
- RLS enabled on `exercise_users`.
  - SELECT: a user can see rows where they are the user_id.
  - INSERT: a user can insert rows for themselves.
  - DELETE: a user can delete their own rows.
- The service role (used by edge functions) bypasses RLS, so the AI
  import edge function can read/write all rows freely.
- A trigger function `promote_exercise_if_popular` is created that fires
  AFTER INSERT on `exercise_users`. When the count of distinct users for
  a given exercise reaches 5, it sets `is_custom = false` on that
  exercise, making it visible to everyone.

## Important Notes
1. The trigger is safe to re-run — the migration uses `IF NOT EXISTS`.
2. The RLS policy on `exercises` is dropped and recreated to include the
   new `exercise_users` visibility path.
3. The service role key is used by the edge function, so all writes from
   the AI import flow bypass RLS — this is intentional.
*/

-- ===== exercise_users table =====
CREATE TABLE IF NOT EXISTS exercise_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (exercise_id, user_id)
);

ALTER TABLE exercise_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_exercise_users" ON exercise_users;
CREATE POLICY "select_own_exercise_users"
  ON exercise_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_exercise_users" ON exercise_users;
CREATE POLICY "insert_own_exercise_users"
  ON exercise_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_exercise_users" ON exercise_users;
CREATE POLICY "delete_own_exercise_users"
  ON exercise_users FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_users_exercise_id ON exercise_users(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_users_user_id ON exercise_users(user_id);

-- ===== Auto-promote trigger =====
CREATE OR REPLACE FUNCTION promote_exercise_if_popular()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO user_count
  FROM exercise_users
  WHERE exercise_id = NEW.exercise_id;

  IF user_count >= 5 THEN
    UPDATE exercises
    SET is_custom = false
    WHERE id = NEW.exercise_id AND is_custom = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_exercise_if_popular ON exercise_users;
CREATE TRIGGER trg_promote_exercise_if_popular
  AFTER INSERT ON exercise_users
  FOR EACH ROW
  EXECUTE FUNCTION promote_exercise_if_popular();

-- ===== Update exercises SELECT policy to include exercise_users =====
DROP POLICY IF EXISTS "Anyone can read exercises" ON exercises;
CREATE POLICY "Anyone can read exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    is_custom = false
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM exercise_users
      WHERE exercise_users.exercise_id = exercises.id
      AND exercise_users.user_id = auth.uid()
    )
  );
