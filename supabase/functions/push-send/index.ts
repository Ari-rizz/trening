import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = (await req.json()) as PushPayload;

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, keys")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@irongrid.app";

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        const keys = typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys;
        const payload = JSON.stringify({
          notification: {
            title,
            body,
            data: { ...data, url: "/" },
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-96x96.png",
            vibrate: [100, 50, 100],
          },
        });

        await sendWebPush(sub.endpoint, keys.p256dh, keys.auth, payload, vapidPrivateKey, vapidPublicKey, subject);
        sent++;
      } catch (err) {
        console.error("Push failed for subscription:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  privateKey: string,
  publicKey: string,
  subject: string
): Promise<void> {
  // Minimal Web Push using Web Crypto API
  const encoder = new TextEncoder();
  const ttl = 2419200;

  // Generate VAPID JWT
  const header = { typ: "JWT", alg: "ES256" };
  const payloadJwt = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payloadJwt));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const keyData = pemToBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncodeRaw(signature);
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Encrypt payload using aes128gcm
  const encrypted = await encryptPayload(payload, p256dh, auth);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": String(ttl),
      "Authorization": `vapid t=${jwt}, k=${publicKey}`,
    },
    body: encrypted,
  });

  if (!response.ok && response.status !== 201) {
    throw new Error(`Push endpoint returned ${response.status}`);
  }
}

async function encryptPayload(payload: string, p256dh: string, auth: string): Promise<BufferSource> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(payload);

  // Generate local ECDH key pair
  const localKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlDecode(p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPublicKey },
    localKeys.privateKey,
    256
  );

  // HKDF
  const authSecret = base64UrlDecode(auth);
  const prkKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: encoder.encode("Content-Encoding: auth\0") },
    prkKey,
    256
  );

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // AES-GCM encryption
  const cek = await deriveKey(ikm, salt, encoder.encode("Content-Encoding: aes128gcm\0"), 128);
  const nonce = await deriveNonce(ikm, salt, encoder.encode("Content-Encoding: nonce\0"), 12);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cek,
    plaintext
  );

  // Export local public key
  const localPubKey = await crypto.subtle.exportKey("raw", localKeys.publicKey);

  // Build aes128gcm record
  return buildAes128gcmRecord(salt, new Uint8Array(localPubKey), encrypted, 4096);
}

function buildAes128gcmRecord(salt: Uint8Array, key: Uint8Array, encrypted: ArrayBuffer, rs: number): BufferSource {
  const recordSize = rs;
  const headerSize = 21 + key.length;
  const padding = recordSize - (encrypted.byteLength + headerSize + 1);
  const totalSize = headerSize + encrypted.byteLength + 1;

  const record = new Uint8Array(totalSize);
  record.set(salt, 0);
  record[16] = key.length;
  record.set(key, 17);
  record[17 + key.length] = 0; // padding delimiter
  record.set(new Uint8Array(encrypted), headerSize);
  return record.buffer;
}

async function deriveKey(ikm: ArrayBuffer, salt: Uint8Array, info: Uint8Array, length: number): Promise<CryptoKey> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    { name: "AES-GCM", length },
    false,
    ["encrypt"]
  );
}

async function deriveNonce(ikm: ArrayBuffer, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeRaw(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
