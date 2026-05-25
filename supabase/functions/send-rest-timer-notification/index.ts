import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BKOf3C4qkjyO0oU5CNNEmVtymDnKXDlK0qLwYrhDfYayEqh6iXTHOhIbNxYiTHwYTQ6pepBc5VjISEm13N0zMGo";
const VAPID_PRIVATE_KEY = "8O7MAPr5eajmeyfMFJgm99D9beVOxXnLxkajILNdaSw";
const VAPID_SUBJECT = "mailto:noreply@irongrid.app";

// --- Utility helpers ---

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
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// --- VAPID JWT ---

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
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(rawPublicKey.slice(1, 33)),
    y: bytesToB64url(rawPublicKey.slice(33, 65)),
    d: bytesToB64url(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsignedToken)));
  return `${unsignedToken}.${bytesToB64url(sig)}`;
}

// --- Web Push Encryption (aes128gcm, RFC 8291) ---

async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: Uint8Array,
): Promise<{ body: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKeyBytes = b64urlToBytes(clientPublicKeyB64);
  const clientAuth = b64urlToBytes(clientAuthB64);

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const clientPublicKey = await crypto.subtle.importKey("raw", clientPublicKeyBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientPublicKey }, localKeyPair.privateKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();

  // IKM = HKDF(auth, sharedSecret, "WebPush: info\0" || clientPub || localPub, 32)
  const authInfo = concat(enc.encode("WebPush: info\0"), clientPublicKeyBytes, localPublicKeyRaw);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // PRK = HKDF-Extract(salt, IKM)
  // Content-Encryption-Key = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload: payload + 0x02 (single pad delimiter for aes128gcm)
  const padded = concat(payload, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  return { body: encrypted, salt, localPublicKey: localPublicKeyRaw };
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));

  const infoWithCounter = concat(info, new Uint8Array([1]));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

// --- Build aes128gcm body with header ---

function buildAes128gcmBody(encrypted: Uint8Array, salt: Uint8Array, localPublicKey: Uint8Array): Uint8Array {
  // Header: salt (16) + rs (4, big-endian uint32) + idlen (1) + keyid (65 for P-256)
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);
  const idlen = new Uint8Array([localPublicKey.length]);
  return concat(salt, rsBytes, idlen, localPublicKey, encrypted);
}

// --- Send push notification ---

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payloadStr: string,
): Promise<{ ok: boolean; status: number; statusText: string }> {
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const { body: encrypted, salt, localPublicKey } = await encryptPayload(sub.p256dh, sub.auth, payloadBytes);
  const requestBody = buildAes128gcmBody(encrypted, salt, localPublicKey);

  const endpoint = new URL(sub.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;
  const jwt = await createVapidJwt(audience);

  const vapidPubB64 = VAPID_PUBLIC_KEY;
  const response = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(requestBody.length),
      TTL: "300",
      Authorization: `vapid t=${jwt}, k=${vapidPubB64}`,
    },
    body: requestBody,
  });

  return { ok: response.ok, status: response.status, statusText: response.statusText };
}

// --- Main handler ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_WAIT_MS = 5 * 60 * 1000;

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

    if (req.method === "DELETE") {
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

    const delayMs = Math.max(0, fireAt - Date.now());
    if (delayMs > MAX_WAIT_MS) {
      return new Response(JSON.stringify({ error: "Timer too long (max 5 min)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    EdgeRuntime.waitUntil(
      (async () => {
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

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (subs && subs.length > 0) {
          const staleEndpoints: string[] = [];
          for (const sub of subs) {
            const result = await sendPush(sub, notification);
            console.log(`Push to ${sub.endpoint.slice(0, 50)}... => ${result.status} ${result.statusText}`);
            if (result.status === 410) staleEndpoints.push(sub.endpoint);
          }
          if (staleEndpoints.length > 0) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", userId)
              .in("endpoint", staleEndpoints);
          }
        }
      })(),
    );

    return new Response(JSON.stringify({ ok: true, delayMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
