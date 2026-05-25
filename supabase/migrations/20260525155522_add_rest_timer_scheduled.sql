/*
  # Add rest_timer_scheduled table

  ## Purpose
  Store pending rest timer notifications server-side so they survive app closure,
  phone lock, and edge function timeouts. A cron job polls this table every minute
  and sends push notifications for rows where fire_at <= now() and sent = false.

  ## New Tables
  - `rest_timer_scheduled`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `fire_at` (timestamptz) — exact moment to send the notification
    - `sent` (boolean, default false) — set to true once push is delivered
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can insert/update/delete their own rows
  - Service role (used by cron edge function) bypasses RLS
*/

CREATE TABLE IF NOT EXISTS rest_timer_scheduled (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fire_at    timestamptz NOT NULL,
  sent       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rest_timer_scheduled_fire_at_idx
  ON rest_timer_scheduled (fire_at)
  WHERE sent = false;

ALTER TABLE rest_timer_scheduled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own scheduled timers"
  ON rest_timer_scheduled FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled timers"
  ON rest_timer_scheduled FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled timers"
  ON rest_timer_scheduled FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can select own scheduled timers"
  ON rest_timer_scheduled FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
