/*
# Schedule daily workout motivation reminder

## Summary
Schedules a new pg_cron job that fires the send-reminders edge function
every day at 10:00 UTC (12:00 Oslo time) with type=workout so users who
haven't trained yet receive a motivational message.

## Notes
1. The existing weight reminder cron ('daily-weight-reminder') runs at
   04:00 UTC and is unchanged.
2. This new job sends `{ "type": "workout" }` so the edge function only
   processes workout reminders, not weight reminders.
3. Idempotent: uses DO block to unschedule first if the job exists.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-workout-reminder') THEN
    PERFORM cron.unschedule('daily-workout-reminder');
  END IF;
END $$;

SELECT cron.schedule(
  'daily-workout-reminder',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://olevdovepnhjicueqypa.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZXZkb3ZlcG5oamljdWVxeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzQwNjAsImV4cCI6MjA5NDE1MDA2MH0.ZRoT-SCkg7J7hkmY3h50JwCcgsmi5ocwqG9J9MyZMEI"}'::jsonb,
    body := '{"type":"workout"}'::jsonb
  );
  $$
);
