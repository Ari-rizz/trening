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
      { TTL: 3600 },
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

    const today = new Date().toISOString().split("T")[0];

    const { data: allSubs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth");

    if (subsError || !allSubs || allSubs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(allSubs.map((s: any) => s.user_id))];
    const { data: alreadyLogged } = await supabase
      .from("body_weight_logs")
      .select("user_id")
      .eq("logged_at", today)
      .in("user_id", userIds);

    const loggedSet = new Set((alreadyLogged ?? []).map((r: any) => r.user_id));
    const pendingSubs = allSubs.filter((s: any) => !loggedSet.has(s.user_id));

    if (pendingSubs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "all logged" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notification = JSON.stringify({
      title: "Vektkontroll",
      body: "Husk \u00e5 legge inn dagens vekt",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: "weight-reminder",
    });

    const staleEndpoints: string[] = [];
    let sent = 0;

    await Promise.all(
      pendingSubs.map(async (sub: any) => {
        const result = await sendPush(sub, notification);
        if (result.ok) {
          sent++;
        } else if (result.status === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }),
    );

    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return new Response(JSON.stringify({ ok: true, sent, stale: staleEndpoints.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
