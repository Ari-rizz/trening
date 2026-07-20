import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const functionUrl = Deno.env.get("SUPABASE_URL")!;

    // Fetch all users with reminder preferences enabled and at least one push subscription
    const { data: users, error } = await supabase
      .from("notification_preferences")
      .select(`
        user_id,
        workout_reminder_enabled,
        workout_reminder_time,
        weight_reminder_enabled,
        weight_reminder_time,
        goal_reminder_enabled
      `)
      .eq("push_enabled", true);

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const now = new Date();
    const currentHour = now.getHours();

    for (const user of users) {
      const anyReminder: any = user;
      const shouldSendWorkout = anyReminder.workout_reminder_enabled && anyReminder.workout_reminder_time;
      const shouldSendWeight = anyReminder.weight_reminder_enabled && anyReminder.weight_reminder_time;

      let title = "";
      let body = "";

      if (shouldSendWorkout && parseHour(anyReminder.workout_reminder_time) === currentHour) {
        title = "Tid for trening!";
        body = "Husk å logge dagens økt i IronGrid.";
      } else if (shouldSendWeight && parseHour(anyReminder.weight_reminder_time) === currentHour) {
        title = "Tid for å veie seg";
        body = "Logg dagens kroppsvekt i IronGrid.";
      } else if (anyReminder.goal_reminder_enabled && now.getDay() === 1) {
        // Weekly goal check-in on Mondays at 8am
        if (currentHour === 8) {
          title = "Måloppdatering";
          body = "Sjekk fremgangen på målene dine denne uken.";
        }
      }

      if (!title) continue;

      try {
        const pushResponse = await fetch(`${functionUrl}/functions/v1/push-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            user_id: user.user_id,
            title,
            body,
            data: { type: "reminder" },
          }),
        });

        if (pushResponse.ok) sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${user.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: users.length, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseHour(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):/);
  return match ? parseInt(match[1], 10) : -1;
}
