import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BKOf3C4qkjyO0oU5CNNEmVtymDnKXDlK0qLwYrhDfYayEqh6iXTHOhIbNxYiTHwYTQ6pepBc5VjISEm13N0zMGo";
const VAPID_PRIVATE_KEY = "8O7MAPr5eajmeyfMFJgm99D9beVOxXnLxkajILNdaSw";
const VAPID_SUBJECT = "mailto:noreply@irongrid.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// --- Crypto helpers (same as send-weight-reminder) ---

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

async function encryptPayload(clientPublicKeyB64: string, clientAuthB64: string, payload: Uint8Array) {
  const clientPublicKeyBytes = b64urlToBytes(clientPublicKeyB64);
  const clientAuth = b64urlToBytes(clientAuthB64);
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));
  const clientPublicKey = await crypto.subtle.importKey("raw", clientPublicKeyBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientPublicKey }, localKeyPair.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const authInfo = concat(enc.encode("WebPush: info\0"), clientPublicKeyBytes, localPublicKeyRaw);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const padded = concat(payload, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));
  return { body: encrypted, salt, localPublicKey: localPublicKeyRaw };
}

function buildAes128gcmBody(encrypted: Uint8Array, salt: Uint8Array, localPublicKey: Uint8Array): Uint8Array {
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);
  return concat(salt, rsBytes, new Uint8Array([localPublicKey.length]), localPublicKey, encrypted);
}

async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT };
  const enc = new TextEncoder();
  const headerB64 = bytesToB64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToB64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const privateKeyBytes = b64urlToBytes(VAPID_PRIVATE_KEY);
  const rawPublicKey = b64urlToBytes(VAPID_PUBLIC_KEY);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: bytesToB64url(rawPublicKey.slice(1, 33)),
    y: bytesToB64url(rawPublicKey.slice(33, 65)),
    d: bytesToB64url(privateKeyBytes),
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsignedToken)));
  return `${unsignedToken}.${bytesToB64url(sig)}`;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payloadStr: string): Promise<{ ok: boolean; status: number }> {
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const { body: encrypted, salt, localPublicKey } = await encryptPayload(sub.p256dh, sub.auth, payloadBytes);
  const requestBody = buildAes128gcmBody(encrypted, salt, localPublicKey);
  const endpoint = new URL(sub.endpoint);
  const jwt = await createVapidJwt(`${endpoint.protocol}//${endpoint.host}`);
  const response = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(requestBody.length),
      TTL: "3600",
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body: requestBody,
  });
  return { ok: response.ok, status: response.status };
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { fireAt } = await req.json();
      if (typeof fireAt !== "number") {
        return new Response(JSON.stringify({ error: "Missing fireAt" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", user.id);

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no subscriptions" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Wait until fireAt, then send push to all user's devices
      const delayMs = Math.max(0, fireAt - Date.now());
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      const notification = JSON.stringify({
        title: "Hvile ferdig!",
        body: "Tid for neste sett",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-96x96.png",
        tag: "rest-timer",
      });

      const staleEndpoints: string[] = [];
      let sent = 0;

      await Promise.all(subs.map(async (sub: any) => {
        const result = await sendPush(sub, notification);
        if (result.ok) {
          sent++;
        } else if (result.status === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }));

      if (staleEndpoints.length > 0) {
        await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
      }

      return new Response(JSON.stringify({ ok: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
