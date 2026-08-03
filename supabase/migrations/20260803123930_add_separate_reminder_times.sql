/*
# Add separate reminder times for weight and workout notifications

## Summary
Adds two new columns to `notification_preferences` so weight reminders and workout
reminders can fire at different times of day. Previously a single `reminder_time`
column was shared across all reminder types.

## Modified Tables
- `notification_preferences`
  - `weight_reminder_time` (time, default '06:00') — when the daily weight reminder fires
  - `workout_reminder_time` (time, default '12:00') — when the daily workout motivation reminder fires

## Notes
1. Both columns are nullable to preserve backwards compatibility.
2. Existing rows will get NULL on the new columns; the edge function defaults to
   '06:00' and '12:00' when NULL.
3. The original `reminder_time` column is kept for the goal reminder and any
   legacy code paths.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_preferences' AND column_name='weight_reminder_time') THEN
    ALTER TABLE notification_preferences ADD COLUMN weight_reminder_time time DEFAULT '06:00';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_preferences' AND column_name='workout_reminder_time') THEN
    ALTER TABLE notification_preferences ADD COLUMN workout_reminder_time time DEFAULT '12:00';
  END IF;
END $$;
