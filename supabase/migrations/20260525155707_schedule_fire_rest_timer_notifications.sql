/*
  # Schedule fire-rest-timer-notifications cron job

  ## Purpose
  Calls the fire-rest-timer-notifications edge function every minute.
  This polls the rest_timer_scheduled table and sends Web Push notifications
  for any timers that have elapsed, ensuring notifications fire even when
  the app is closed or the phone is locked.

  ## Changes
  - Adds a pg_cron job "fire-rest-timers" running every minute
  - Uses net.http_post to invoke the deployed edge function
*/

SELECT cron.schedule(
  'fire-rest-timers',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM pg_settings WHERE name = 'app.supabase_url' LIMIT 1) || '/functions/v1/fire-rest-timer-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM pg_settings WHERE name = 'app.supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
