/*
  # Fix fire-rest-timers cron job with hardcoded URL

  The previous migration used pg_settings which are not populated in hosted Supabase.
  This drops the broken job and recreates it with the hardcoded project URL and anon key.
  The fire-rest-timer-notifications function has verify_jwt=false so the anon key is sufficient.
*/

SELECT cron.unschedule('fire-rest-timers');

SELECT cron.schedule(
  'fire-rest-timers',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://olevdovepnhjicueqypa.supabase.co/functions/v1/fire-rest-timer-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZXZkb3ZlcG5oamljdWVxeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzQwNjAsImV4cCI6MjA5NDE1MDA2MH0.ZRoT-SCkg7J7hkmY3h50JwCcgsmi5ocwqG9J9MyZMEI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
