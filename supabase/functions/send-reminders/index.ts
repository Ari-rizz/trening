import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOTIVATIONAL_MESSAGES = [
  "Hei! Klokken er 12 og du har ikke trent ennå. Det er ikke for sent!",
  "Løfting venter ikke. Men den venter litt på deg. Kom igjen!",
  "En økt tar 45 minutter. Du har 12 timer igjen. Ingen unnskyldninger!",
  "Jern venter. Det venter alltid. Gå til gymmet.",
  "Hver økt du dropper er en økt du aldri får tilbake. Bli med!",
  "Du trenger ikke ha det bra for å starte. Du må starte for å få det bra.",
  "Kroppen din vil takke deg senere. Gå og løft!",
  "Det er ikke kroppen som gir opp først. Det er hodet. Vis den hvem som sjef.",
  "Stol på prosessen. Stol på jernet. Bli med på gymmet i dag.",
  "Fremgang skjer ikke på sofaen. Bli med på gymmet!",
  "Du har aldri angret på en økt. Gå og tren!",
  "Drømmene dine vil at du skal løfte. Ikke skuff drømmene dine.",
  "Jern er terapi. Gå og få terapien din.",
  "Den eneste dårlige økten er den som ikke skjer. Kom igjen!",
  "Styrke bygger seg ikke av seg selv. Bli med på gymmet i dag!",
];

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

    // Parse request body for reminder type filter
    let reminderType: "weight" | "workout" | "all" = "all";
    try {
      const body = await req.json();
      if (body?.type === "weight" || body?.type === "workout") {
        reminderType = body.type;
      }
    } catch {
      // No body or invalid JSON — run all reminders
    }

    // Fetch users with notification preferences and their push subscriptions
    const { data: users, error } = await supabase
      .from("notification_preferences")
      .select(`
        user_id,
        rest_timer,
        weight_reminder,
        workout_reminder,
        goal_reminder,
        reminder_time,
        weight_reminder_time,
        workout_reminder_time
      `);

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to users who have at least one push subscription
    const userIds = users.map((u: any) => u.user_id);
    const { data: pushSubs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", userIds);

    const usersWithPush = new Set((pushSubs || []).map((p: any) => p.user_id));

    let sent = 0;
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split("T")[0];

    for (const user of users) {
      if (!usersWithPush.has(user.user_id)) continue;

      const prefs: any = user;
      let title = "";
      let body = "";

      // Weight reminder (06:00 Oslo = 04:00 UTC)
      if (
        (reminderType === "weight" || reminderType === "all") &&
        prefs.weight_reminder
      ) {
        const weightTime = prefs.weight_reminder_time ?? "06:00";
        if (parseHour(weightTime) === currentHour) {
          // Check if user has ever logged weight
          const { count: weightLogCount } = await supabase
            .from("body_weight_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.user_id);

          if (weightLogCount && weightLogCount > 0) {
            // Check if they already logged today
            const { count: todayCount } = await supabase
              .from("body_weight_logs")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.user_id)
              .eq("logged_at", todayStr);

            if (!todayCount || todayCount === 0) {
              title = "Tid for å veie seg";
              body = "Logg dagens kroppsvekt i IronGrid.";
            }
          }
        }
      }

      // Workout reminder (12:00 Oslo = 10:00 UTC)
      if (
        !title &&
        (reminderType === "workout" || reminderType === "all") &&
        prefs.workout_reminder
      ) {
        const workoutTime = prefs.workout_reminder_time ?? "12:00";
        if (parseHour(workoutTime) === currentHour) {
          // Check if user already completed a workout today
          const { count: workoutCount } = await supabase
            .from("workouts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.user_id)
            .eq("date", todayStr)
            .eq("is_completed", true);

          if (!workoutCount || workoutCount === 0) {
            const msgIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
            title = "Øktpåminnelse";
            body = MOTIVATIONAL_MESSAGES[msgIndex];
          }
        }
      }

      // Goal reminder (weekly on Mondays at 08:00 local)
      if (
        !title &&
        (reminderType === "all") &&
        prefs.goal_reminder &&
        now.getDay() === 1 &&
        currentHour === 6
      ) {
        title = "Måloppdatering";
        body = "Sjekk fremgangen på målene dine denne uken.";
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
  const match = timeStr?.match(/^(\d{1,2}):/);
  return match ? parseInt(match[1], 10) : -1;
}
