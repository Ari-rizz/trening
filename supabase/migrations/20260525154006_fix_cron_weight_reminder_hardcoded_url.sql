/*
  # Fix daily weight reminder cron job

  The previous cron job used current_setting('app.supabase_url', true) and
  current_setting('app.service_role_key', true) which are never populated in
  Supabase hosted environments, causing the HTTP call to silently fail.

  This migration drops the broken job and recreates it with hardcoded values.
  The send-weight-reminder function has verifyJWT=false so the anon key is
  sufficient for authorization.
*/

SELECT cron.unschedule('daily-weight-reminder');

SELECT cron.schedule(
  'daily-weight-reminder',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://olevdovepnhjicueqypa.supabase.co/functions/v1/send-weight-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZXZkb3ZlcG5oamljdWVxeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzQwNjAsImV4cCI6MjA5NDE1MDA2MH0.ZRoT-SCkg7J7hkmY3h50JwCcgsmi5ocwqG9J9MyZMEI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
