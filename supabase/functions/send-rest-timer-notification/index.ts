import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// VAPID / Web Push helpers (same as fire-rest-timer-notifications)
// ---------------------------------------------------------------------------

const VAPID_PUBLIC_KEY = "BKOf3C4qkjyO0oU5CNNEmVtymDnKXDlK0qLwYrhDfYayEqh6iXTHOhIbNxYiTHwYTQ6pepBc5VjISEm13N0zMGo";
const VAPID_PRIVATE_KEY_B64 = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg8O7MAPr5eajmeyfMFJgm99D9beVOxXnLxkajILNdaSyhRANCAASjn9wuKpI8jtKFOQjTRJlbcpg5ylw5StKi8GK4Q32GshKoeol0xzoSGzcWIkx8GE0OqXqQXOVYyEhJtdzdMzBq";
const VAPID_SUBJECT = "mailto:noreply@irongrid.app";

function b64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    b64.length + (4 - (b64.length % 4)) % 4, "=",
  );
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function makeVapidAuthHeader(audience: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: expiry, sub: VAPID_SUBJECT })));
  const sigInput = `${header}.${payload}`;
  const der = b64urlToBytes(VAPID_PRIVATE_KEY_B64);
  const privKey = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privKey, new TextEncoder().encode(sigInput));
  return `vapid t=${sigInput}.${bytesToB64url(new Uint8Array(sig))},k=${VAPID_PUBLIC_KEY}`;
}

async function encryptPayloadAes128gcm(
  subscription: { endpoint: string; p256dh: string; auth: string },
  plaintext: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const receiverPublicKeyRaw = b64urlToBytes(subscription.p256dh);
  const authSecret = b64urlToBytes(subscription.auth);

  const receiverPublicKey = await crypto.subtle.importKey(
    "raw", receiverPublicKeyRaw, { name: "ECDH", namedCurve: "P-256" }, false, [],
  );
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"],
  );
  const senderPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeyPair.publicKey),
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverPublicKey }, senderKeyPair.privateKey, 256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM via HKDF: info = "WebPush: info\0" + receiver_pub(65) + sender_pub(65)
  const ikm_info = new Uint8Array(
    encoder.encode("WebPush: info\0").length + 65 + 65,
  );
  const infoPrefix = encoder.encode("WebPush: info\0");
  ikm_info.set(infoPrefix, 0);
  ikm_info.set(receiverPublicKeyRaw, infoPrefix.length);
  ikm_info.set(senderPublicKeyRaw, infoPrefix.length + 65);

  const ikmKey = await crypto.subtle.importKey("raw", authSecret, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: ikm_info }, ikmKey, 256,
    ),
  );

  // CEK: HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const prkKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, prkKey, 128,
    ),
  );

  // Nonce: HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96,
    ),
  );

  // Encrypt: plaintext + \x02 padding delimiter (single record, last record)
  const plaintextBytes = encoder.encode(plaintext);
  const record = new Uint8Array(plaintextBytes.length + 1);
  record.set(plaintextBytes, 0);
  record[plaintextBytes.length] = 2; // delimiter for final record

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, record),
  );

  // Build aes128gcm payload: header(salt[16] + rs[4] + idlen[1] + keyid[65]) + encrypted
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = 65; // idlen = length of sender public key
  header.set(senderPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const vapidHeader = await makeVapidAuthHeader(audience);
  const body = await encryptPayloadAes128gcm(subscription, payload);
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Authorization": vapidHeader,
      "TTL": "300",
    },
    body,
  });
  return { ok: res.ok, status: res.status };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_WAIT_MS = 120_000; // 2 minutes — safe margin for edge function execution

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

    // DELETE = cancel pending timer
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

    // POST = schedule new timer
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

    // Replace any unsent timers with the new one
    await supabase
      .from("rest_timer_scheduled")
      .delete()
      .eq("user_id", user.id)
      .eq("sent", false);

    // If delay is short enough, send push directly via waitUntil (no cron delay)
    if (delayMs > 0 && delayMs <= MAX_WAIT_MS) {
      // Insert as NOT sent; we mark sent only after successful delivery
      const { data: inserted } = await supabase
        .from("rest_timer_scheduled")
        .insert({ user_id: user.id, fire_at: fireAtTs, sent: false })
        .select("id")
        .maybeSingle();

      const rowId = inserted?.id;
      const userId = user.id;

      // Use EdgeRuntime.waitUntil to wait for the delay then send push
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
                const result = await sendWebPush(sub, notification);
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
            // Only mark sent if at least one push was delivered
            if (delivered && rowId) {
              await supabase
                .from("rest_timer_scheduled")
                .update({ sent: true })
                .eq("id", rowId);
            }
          }
          // If no subs found, leave sent=false so cron can retry
        })(),
      );

      return new Response(JSON.stringify({ ok: true, mode: "immediate", scheduled: fireAtTs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For longer timers (>2min), save to DB and let cron handle it
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
