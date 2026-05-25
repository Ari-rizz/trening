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
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_WAIT_MS = 120_000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (req.method === "DELETE") {
      await supabase
        .from("rest_timer_scheduled")
        .delete()
        .eq("user_id", user.id)
        .eq("sent", false);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { fireAt } = body as { fireAt: number };
    if (typeof fireAt !== "number") {
      return new Response(JSON.stringify({ error: "Missing fireAt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const delayMs = fireAt - Date.now();
    const fireAtTs = new Date(fireAt).toISOString();

    await supabase
      .from("rest_timer_scheduled")
      .delete()
      .eq("user_id", user.id)
      .eq("sent", false);

    if (delayMs > 0 && delayMs <= MAX_WAIT_MS) {
      const { data: inserted } = await supabase
        .from("rest_timer_scheduled")
        .insert({ user_id: user.id, fire_at: fireAtTs, sent: false })
        .select("id")
        .maybeSingle();

      const rowId = inserted?.id;
      const userId = user.id;

      EdgeRuntime.waitUntil(
        (async () => {
          await new Promise((r) => setTimeout(r, delayMs));
          const notification = JSON.stringify({
            title: "Hvile ferdig!",
            body: "Tid for neste sett",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-96x96.png",
            tag: "rest-timer",
          });
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", userId);
          if (subs && subs.length > 0) {
            const staleEndpoints: string[] = [];
            let delivered = false;
            await Promise.all(
              subs.map(async (sub) => {
                const result = await sendPush(sub, notification);
                if (result.ok) delivered = true;
                if (result.status === 410) staleEndpoints.push(sub.endpoint);
              }),
            );
            if (staleEndpoints.length > 0) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("user_id", userId)
                .in("endpoint", staleEndpoints);
            }
            if (delivered && rowId) {
              await supabase
                .from("rest_timer_scheduled")
                .update({ sent: true })
                .eq("id", rowId);
            }
          }
        })(),
      );

      return new Response(JSON.stringify({ ok: true, mode: "immediate", scheduled: fireAtTs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase
      .from("rest_timer_scheduled")
      .insert({ user_id: user.id, fire_at: fireAtTs, sent: false });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, mode: "cron", scheduled: fireAtTs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
