-- Add is_lifetime column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false;

-- Grant lifetime access to Arian Rizzuti and Filip
UPDATE profiles SET is_lifetime = true
WHERE id IN ('d4882f6b-91ac-498f-8402-4bd7b60bd618', 'cada3a3b-72a2-406f-90d0-d2bd93b73b72');
