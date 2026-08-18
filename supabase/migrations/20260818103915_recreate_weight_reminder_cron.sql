/*
  # Fix reminder cron jobs for Oslo timezone

  1. Re-create the daily-weight-reminder cron job (was removed in an
     earlier migration). Runs at 04:00 UTC = 06:00 Oslo winter / 07:00 summer.
  2. Keep the existing daily-workout-reminder at 10:00 UTC = 12:00 Oslo winter.
  3. The send-reminders edge function now uses Europe/Oslo timezone
     internally, so the hour comparison is correct regardless of DST.

  Both jobs call send-reminders with the appropriate type filter.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-weight-reminder') THEN
    PERFORM cron.unschedule('daily-weight-reminder');
  END IF;
END $$;

SELECT cron.schedule(
  'daily-weight-reminder',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://olevdovepnhjicueqypa.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZXZkb3ZlcG5oamljdWVxeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzQwNjAsImV4cCI6MjA5NDE1MDA2MH0.ZRoT-SCkg7J7hkmY3h50JwCcgsmi5ocwqG9J9MyZMEI"}'::jsonb,
    body := '{"type":"weight"}'::jsonb
  );
  $$
);
