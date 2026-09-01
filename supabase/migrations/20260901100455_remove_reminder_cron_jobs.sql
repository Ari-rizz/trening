/*
  # Remove server-side reminder cron jobs

  Reminders are now handled entirely by local notifications on the
  native app. The server-side cron jobs that called send-reminders
  are no longer needed since there are no web push subscribers.
*/

SELECT cron.unschedule('daily-weight-reminder');
SELECT cron.unschedule('daily-workout-reminder');
