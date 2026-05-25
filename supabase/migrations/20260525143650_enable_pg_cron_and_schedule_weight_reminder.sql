/*
  # Enable pg_cron and schedule daily weight reminder

  Enables the pg_cron extension and schedules send-weight-reminder
  to run at 04:00 UTC (06:00 Oslo time) every day.
  Only sends to users who haven't logged weight today.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'daily-weight-reminder',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/send-weight-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
