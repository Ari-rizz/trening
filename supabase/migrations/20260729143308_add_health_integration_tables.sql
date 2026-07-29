/*
# Health App Integration - Calorie Tracking

## Overview
Adds support for connecting Apple Health / Health Connect to read calorie data,
and a table to cache daily calorie totals synced from the health app.

## Changes

### 1. profiles table - new columns
- `health_connected` (boolean, default false): whether the user has connected a health app
- `health_provider` (text, nullable): which provider is connected ('apple_health' | 'health_connect')

### 2. New table: daily_calorie_logs
Caches daily calorie totals per user, sourced from the health app.
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users, not null)
- `date` (date, not null): the calendar day
- `calories` (numeric, not null): total calories burned that day from health app
- `source` (text, default 'health_app'): where the calories came from
- `synced_at` (timestamptz, default now()): when this record was last synced
- Unique constraint on (user_id, date) so each day has one record per user

### 3. Security
- RLS enabled on daily_calorie_logs
- Owner-scoped CRUD policies (authenticated users can only access their own calorie logs)
- user_id defaults to auth.uid() for safe inserts

## Notes
1. The daily_calorie_logs table is a cache of health-app data - the app reads
   calories from Apple HealthKit / Health Connect and stores daily totals here
   so the dashboard can display them without querying the health store every time.
2. Strength workout calories are NOT estimated - only health-app-sourced calories
   are shown, per user request.
*/

-- Add health columns to profiles
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_connected boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_provider text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create daily calorie logs table
CREATE TABLE IF NOT EXISTS daily_calorie_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  calories numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'health_app',
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_calorie_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_calorie_logs" ON daily_calorie_logs;
CREATE POLICY "select_own_calorie_logs" ON daily_calorie_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_calorie_logs" ON daily_calorie_logs;
CREATE POLICY "insert_own_calorie_logs" ON daily_calorie_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_calorie_logs" ON daily_calorie_logs;
CREATE POLICY "update_own_calorie_logs" ON daily_calorie_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_calorie_logs" ON daily_calorie_logs;
CREATE POLICY "delete_own_calorie_logs" ON daily_calorie_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for fast lookups by user and date
CREATE INDEX IF NOT EXISTS idx_daily_calorie_logs_user_date ON daily_calorie_logs(user_id, date DESC);