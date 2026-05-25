/*
  # Remove push notifications infrastructure

  Removes all push notification and rest timer scheduling infrastructure:

  1. Cron jobs removed
    - `fire-rest-timers` (every minute)
    - `daily-weight-reminder` (daily at 04:00 UTC)

  2. Tables dropped
    - `rest_timer_scheduled` - scheduled rest timer push events
    - `push_subscriptions` - Web Push endpoint/key storage

  Note: pg_cron and pg_net extensions are left in place as they may be used elsewhere.
*/

-- Remove cron jobs
SELECT cron.unschedule('fire-rest-timers');
SELECT cron.unschedule('daily-weight-reminder');

-- Drop tables
DROP TABLE IF EXISTS rest_timer_scheduled;
DROP TABLE IF EXISTS push_subscriptions;
