import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// VAPID helpers (Web Crypto, no external deps)
// ---------------------------------------------------------------------------

const VAPID_PUBLIC_KEY = "BKOf3C4qkjyO0oU5CNNEmVtymDnKXDlK0qLwYrhDfYayEqh6iXTHOhIbNxYiTHwYTQ6pepBc5VjISEm13N0zMGo";
// pkcs8 DER base64url of the private key
const VAPID_PRIVATE_KEY_B64 = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg8O7MAPr5eajmeyfMFJgm99D9beVOxXnLxkajILNdaSyhRANCAASjn9wuKpI8jtKFOQjTRJlbcpg5ylw5StKi8GK4Q32GshKoeol0xzoSGzcWIkx8GE0OqXqQXOVYyEhJtdzdMzBq";
const VAPID_SUBJECT = "mailto:noreply@irongrid.app";

function b64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    b64.length + (4 - (b64.length % 4)) % 4,
    "=",
  );
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function importVapidPrivateKey(): Promise<CryptoKey> {
  const der = b64urlToBytes(VAPID_PRIVATE_KEY_B64);
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function makeVapidAuthHeader(audience: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = bytesToB64url(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payload = bytesToB64url(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: expiry, sub: VAPID_SUBJECT }),
    ),
  );
  const sigInput = `${header}.${payload}`;
  const privKey = await importVapidPrivateKey();
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    new TextEncoder().encode(sigInput),
  );
  const jwt = `${sigInput}.${bytesToB64url(new Uint8Array(sig))}`;
  return `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;
}

// ---------------------------------------------------------------------------
// Web Push encryption (RFC 8291 / draft-ietf-httpbis-encryption-content-coding)
// ---------------------------------------------------------------------------

async function encryptPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  plaintext: string,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();

  // Import receiver's public key
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    b64urlToBytes(subscription.p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // Generate ephemeral sender key pair
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const senderPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeyPair.publicKey),
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverPublicKey },
      senderKeyPair.privateKey,
      256,
    ),
  );

  // salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const authInfo = encoder.encode("Content-Encoding: auth\0");
  const receiverPublicKeyRaw = b64urlToBytes(subscription.p256dh);
  const authSecret = b64urlToBytes(subscription.auth);

  // PRK_combine = HKDF(auth_secret, shared_secret, "Content-Encoding: auth\0", 32)
  const prkCombineKey = await crypto.subtle.importKey("raw", authSecret, "HKDF", false, ["deriveBits"]);
  const prkCombine = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: authInfo },
      prkCombineKey,
      256,
    ),
  );

  // context = "P-256\0" + length(receiverKey) + receiverKey + length(senderKey) + senderKey
  const contextLabel = encoder.encode("P-256\0");
  const context = new Uint8Array(
    contextLabel.length + 2 + receiverPublicKeyRaw.length + 2 + senderPublicKeyRaw.length,
  );
  let offset = 0;
  context.set(contextLabel, offset); offset += contextLabel.length;
  new DataView(context.buffer).setUint16(offset, receiverPublicKeyRaw.length, false); offset += 2;
  context.set(receiverPublicKeyRaw, offset); offset += receiverPublicKeyRaw.length;
  new DataView(context.buffer).setUint16(offset, senderPublicKeyRaw.length, false); offset += 2;
  context.set(senderPublicKeyRaw, offset);

  const ceAuthInfo = new Uint8Array([...encoder.encode("Content-Encoding: aesgcm\0"), ...context]);
  const nonceInfo = new Uint8Array([...encoder.encode("Content-Encoding: nonce\0"), ...context]);

  const prkKey = await crypto.subtle.importKey("raw", prkCombine, "HKDF", false, ["deriveBits"]);

  const contentEncryptionKey = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: ceAuthInfo },
      prkKey,
      128,
    ),
  );
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      prkKey,
      96,
    ),
  );

  const aesKey = await crypto.subtle.importKey("raw", contentEncryptionKey, "AES-GCM", false, ["encrypt"]);

  // Pad plaintext with 0x00 prefix byte (no padding)
  const plaintextBytes = encoder.encode(plaintext);
  const padded = new Uint8Array(2 + plaintextBytes.length);
  new DataView(padded.buffer).setUint16(0, 0, false); // 0 bytes padding
  padded.set(plaintextBytes, 2);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  return { ciphertext, salt, serverPublicKey: senderPublicKeyRaw };
}

// ---------------------------------------------------------------------------
// Send a single Web Push message
// ---------------------------------------------------------------------------

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  ttl: number,
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const vapidHeader = await makeVapidAuthHeader(audience);

  const { ciphertext, salt, serverPublicKey } = await encryptPayload(subscription, payload);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      "Encryption": `salt=${bytesToB64url(salt)}`,
      "Crypto-Key": `dh=${bytesToB64url(serverPublicKey)};${vapidHeader.replace("vapid ", "vapid;")}`,
      "Authorization": vapidHeader,
      "TTL": String(ttl),
    },
    body: ciphertext,
  });

  return { ok: res.ok, status: res.status };
}

// ---------------------------------------------------------------------------
// Edge function handler
// ---------------------------------------------------------------------------

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

    const body = await req.json();
    // fireAt: absolute epoch ms when notification should fire
    const { fireAt } = body as { fireAt: number };
    if (typeof fireAt !== "number") {
      return new Response(JSON.stringify({ error: "Missing fireAt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user.id);

    if (subsError || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const delayMs = Math.max(0, fireAt - Date.now());

    // Wait until the timer fires, then push to all subscriptions
    EdgeRuntime.waitUntil((async () => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }

      const notification = JSON.stringify({
        title: "Hvile ferdig!",
        body: "Tid for neste sett",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-96x96.png",
        tag: "rest-timer",
      });

      const ttl = 60; // discard if undeliverable after 60 seconds

      const staleEndpoints: string[] = [];
      await Promise.all(
        subs.map(async (sub) => {
          const result = await sendWebPush(sub, notification, ttl);
          // 410 Gone = subscription expired, clean it up
          if (result.status === 410) {
            staleEndpoints.push(sub.endpoint);
          }
        }),
      );

      if (staleEndpoints.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .in("endpoint", staleEndpoints);
      }
    })());

    return new Response(JSON.stringify({ ok: true, scheduled: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
