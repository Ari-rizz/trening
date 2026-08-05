/*
# Add steps column to daily_calorie_logs

## Overview
Adds a `steps` column to the `daily_calorie_logs` table so we can store
the raw step count alongside the calorie estimate. This lets the dashboard
show step-based calorie estimates even when Apple Health / Health Connect
doesn't return active calories directly.

## Changes
### 1. daily_calorie_logs table - new column
- `steps` (integer, nullable, default 0): number of steps walked that day,
  synced from the health app. Nullable so existing rows aren't affected.

## Security
- No policy changes needed — existing owner-scoped RLS policies on
  daily_calorie_logs already cover the new column.

## Notes
1. The steps column is optional (nullable) so existing calorie logs remain valid.
2. The app will read stepCount from Apple Health / Health Connect and estimate
   calories from steps (~0.04 kcal/step), adding this to the calorie total.
*/

DO $$ BEGIN
  ALTER TABLE daily_calorie_logs ADD COLUMN IF NOT EXISTS steps integer DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
