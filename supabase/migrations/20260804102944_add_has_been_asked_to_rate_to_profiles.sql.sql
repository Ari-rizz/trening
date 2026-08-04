-- Add column to track whether the user has been asked to rate the app
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_been_asked_to_rate boolean NOT NULL DEFAULT false;