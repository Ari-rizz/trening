import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BKOf3C4qkjyO0oU5CNNEmVtymDnKXDlK0qLwYrhDfYayEqh6iXTHOhIbNxYiTHwYTQ6pepBc5VjISEm13N0zMGo";
const VAPID_PRIVATE_KEY = "8O7MAPr5eajmeyfMFJgm99D9beVOxXnLxkajILNdaSw";

webpush.setVapidDetails("mailto:noreply@irongrid.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<{ ok: boolean; status: number }> {
  try {
    const result = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 300 },
    );
    return { ok: result.statusCode >= 200 && result.statusCode < 300, status: result.statusCode };
  } catch (err: any) {
    return { ok: false, status: err.statusCode || 500 };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: dueTimers, error: fetchError } = await supabase
      .from("rest_timer_scheduled")
      .select("id, user_id, fire_at")
      .eq("sent", false)
      .lte("fire_at", new Date().toISOString());

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueTimers || dueTimers.length === 0) {
      return new Response(JSON.stringify({ ok: true, fired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notification = JSON.stringify({
      title: "Hvile ferdig!",
      body: "Tid for neste sett",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: "rest-timer",
    });

    let fired = 0;

    for (const timer of dueTimers) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", timer.user_id);

      if (subs && subs.length > 0) {
        const staleEndpoints: string[] = [];
        await Promise.all(
          subs.map(async (sub) => {
            const result = await sendPush(sub, notification);
            if (result.status === 410) staleEndpoints.push(sub.endpoint);
          }),
        );
        if (staleEndpoints.length > 0) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", timer.user_id)
            .in("endpoint", staleEndpoints);
        }
        fired++;
      }

      await supabase
        .from("rest_timer_scheduled")
        .update({ sent: true })
        .eq("id", timer.id);
    }

    await supabase
      .from("rest_timer_scheduled")
      .delete()
      .eq("sent", true)
      .lt("fire_at", new Date(Date.now() - 3600_000).toISOString());

    return new Response(JSON.stringify({ ok: true, fired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
