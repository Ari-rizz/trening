/*
  # Push notification config table
  
  Stores VAPID keys for web push notifications.
  RLS is enabled with NO policies, meaning only the service role
  (used by Edge Functions) can read/write. Regular clients are locked out.
*/

CREATE TABLE IF NOT EXISTS push_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  vapid_public_key TEXT NOT NULL,
  vapid_private_key TEXT NOT NULL,
  vapid_subject TEXT NOT NULL DEFAULT 'mailto:noreply@irongrid.app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE push_config ENABLE ROW LEVEL SECURITY;

-- Insert the VAPID keys
INSERT INTO push_config (id, vapid_public_key, vapid_private_key, vapid_subject)
VALUES (
  1,
  'BBJhE-pDbHBS7fgF2gOM0n7F2dmXkmAPRpL4qERgnuoc5TSiGL4ZmYMtL3OLowjkZHNfbt5o6AFpmE3vw-ew3-Q',
  '-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgHhRYAqXpIICbELkZ
haXc0z1JZYJAaM1cqkrpOove6eqhRANCAAQSYRPqQ2xwUu34BdoDjNJ+xdnZl5Jg
D0aS+KhEYJ7qHOU0ohi+GZmDLS9zi6MI5GRzX27eaOgBaZhN78PnsN/k
-----END PRIVATE KEY-----',
  'mailto:noreply@irongrid.app'
)
ON CONFLICT (id) DO UPDATE SET
  vapid_public_key = EXCLUDED.vapid_public_key,
  vapid_private_key = EXCLUDED.vapid_private_key,
  vapid_subject = EXCLUDED.vapid_subject,
  updated_at = now();
