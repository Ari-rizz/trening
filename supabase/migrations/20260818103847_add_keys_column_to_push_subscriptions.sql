/*
  # Add keys column to push_subscriptions

  The push-send edge function reads `keys` from push_subscriptions to
  encrypt Web Push payloads, but the table only has a `token` column.
  This adds a `keys` JSONB column so web push subscriptions can store
  the p256dh and auth keys separately from the token/endpoint.
*/

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS keys JSONB;
