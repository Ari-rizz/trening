/*
# Fix push subscription cross-user leak

## Problem
When two users log in from the same browser, the same Web Push endpoint
can be stored for both users. The `send-reminders` edge function sends
to all subscriptions matching a `user_id`, but if the endpoint is shared,
both users receive notifications on the same device.

## Changes
1. Add a unique constraint on `endpoint` in `push_subscriptions` so that
   when a new user logs in on the same browser, the upsert replaces the
   old user's subscription instead of creating a duplicate.
2. Clean up any existing duplicate endpoints by keeping only the most
   recently updated row per endpoint.
3. Update the `onConflict` target: the client upsert should conflict on
   `endpoint` (not `user_id,endpoint`) so re-registering on the same
   browser/device reassigns the subscription to the new user.

## Security
No policy changes. Existing RLS policies remain owner-scoped.
*/

-- Remove duplicates: keep the most recently updated row per endpoint
DELETE FROM push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (endpoint) id
  FROM push_subscriptions
  ORDER BY endpoint, updated_at DESC
);

-- Drop the old unique constraint on (user_id, endpoint) if it exists
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key;

-- Add a unique constraint on endpoint alone so only one user can own a given endpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;
