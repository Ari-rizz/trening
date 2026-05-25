/*
  # Add push_subscriptions table

  ## Purpose
  Stores Web Push API subscriptions per user/device so the server can
  send push notifications (e.g. rest-timer alerts) even when the app is
  backgrounded or the screen is off.

  ## New Tables
  - `push_subscriptions`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK → auth.users, NOT NULL)
    - `endpoint` (text, unique per subscription object)
    - `p256dh` (text) – client public key for encryption
    - `auth` (text) – auth secret for encryption
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only insert/select/delete their own rows
  - No UPDATE policy (subscriptions are immutable; replace by delete + insert)
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own push subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
