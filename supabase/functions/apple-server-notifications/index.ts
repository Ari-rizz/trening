import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BUNDLE_ID = 'no.irongrid.app';

// --- JWS verification (shared with validate-apple-receipt) ---

let appleRootCaPem: string | null = null;

async function getAppleRootCa(): Promise<CryptoKey> {
  if (appleRootCaPem) {
    return importX509Cert(appleRootCaPem);
  }
  const res = await fetch('https://www.apple.com/certificateauthority/AppleRootCA-G3.cer');
  const buf = await res.arrayBuffer();
  appleRootCaPem = derToPem(new Uint8Array(buf));
  return importX509Cert(appleRootCaPem);
}

function derToPem(der: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...der));
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

async function importX509Cert(pem: string): Promise<CryptoKey> {
  const der = pemToDer(pem);
  return crypto.subtle.importKey('spki', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function decodeJwtPart(part: string): any {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const json = atob(padded + pad);
  return JSON.parse(json);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function base64UrlToUint8(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

interface JwsPayload {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  data?: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
    environment?: string;
    appAppleId?: string;
    bundleId?: string;
  };
}

async function verifyJws(jws: string): Promise<JwsPayload | null> {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]) as JwsPayload;

  if (!header.x5c || header.x5c.length === 0) return null;

  const leafCertPem = derToPem(base64ToUint8(header.x5c[0]));
  const leafKey = await importX509Cert(leafCertPem);
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signature = base64UrlToUint8(parts[2]);

  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, leafKey, signature, data);
  if (!valid) return null;

  return payload;
}

interface TransactionInfo {
  originalTransactionId?: string;
  transactionId?: string;
  productId?: string;
  bundleId?: string;
  expiresDate?: number;
  originalPurchaseDate?: number;
  purchaseDate?: number;
  type?: string;
  inAppOwnershipType?: string;
}

interface RenewalInfo {
  originalTransactionId?: string;
  productId?: string;
  autoRenewStatus?: number;
  expirationReason?: string;
}

async function verifySignedTransactionInfo(signedInfo: string): Promise<TransactionInfo | null> {
  const parts = signedInfo.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]) as TransactionInfo;

  if (!header.x5c || header.x5c.length === 0) return null;

  const leafCertPem = derToPem(base64ToUint8(header.x5c[0]));
  const leafKey = await importX509Cert(leafCertPem);
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signature = base64UrlToUint8(parts[2]);

  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, leafKey, signature, data);
  if (!valid) return null;

  if (payload.bundleId && payload.bundleId !== BUNDLE_ID) return null;

  return payload;
}

async function verifySignedRenewalInfo(signedInfo: string): Promise<RenewalInfo | null> {
  const parts = signedInfo.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]) as RenewalInfo;

  if (!header.x5c || header.x5c.length === 0) return null;

  const leafCertPem = derToPem(base64ToUint8(header.x5c[0]));
  const leafKey = await importX509Cert(leafCertPem);
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signature = base64UrlToUint8(parts[2]);

  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, leafKey, signature, data);
  if (!valid) return null;

  return payload;
}

// --- Notification type handling ---

// Notification types that indicate the subscription is no longer active
const EXPIRED_TYPES = new Set([
  'EXPIRED',
  'GRACE_PERIOD_EXPIRED',
]);

// Notification types that indicate cancellation (user turned off auto-renew)
const CANCEL_TYPES = new Set([
  'CANCEL',
  'PRICE_INCREASE',
  'REFUND',
  'REVOKE',
]);

// Notification types that indicate a renewal or active state
const RENEWAL_TYPES = new Set([
  'DID_RENEW',
  'DID_CHANGE_RENEWAL_STATUS',
  'DID_CHANGE_RENEWAL_PREF',
  'DID_FAIL_TO_RENEW',
  'GRACE_PERIOD_EXPIRED',
  'PRICE_INCREASE',
  'REFUND',
  'REVOKE',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { signedPayload?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { signedPayload } = body;
    if (!signedPayload) {
      return new Response(JSON.stringify({ error: 'Missing signedPayload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the top-level JWS from Apple
    const payload = await verifyJws(signedPayload);
    if (!payload) {
      console.error('Apple server notification: JWS verification failed');
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationType = payload.notificationType ?? '';
    const subtype = payload.subtype ?? '';
    const environment = payload.data?.environment ?? 'Production';

    console.log(`Apple notification: type=${notificationType} subtype=${subtype} env=${environment}`);

    // Extract transaction and renewal info from signed payloads
    let transactionInfo: TransactionInfo | null = null;
    let renewalInfo: RenewalInfo | null = null;

    if (payload.data?.signedTransactionInfo) {
      transactionInfo = await verifySignedTransactionInfo(payload.data.signedTransactionInfo);
    }

    if (payload.data?.signedRenewalInfo) {
      renewalInfo = await verifySignedRenewalInfo(payload.data.signedRenewalInfo);
    }

    const originalTransactionId =
      transactionInfo?.originalTransactionId ?? renewalInfo?.originalTransactionId ?? null;
    const transactionId = transactionInfo?.transactionId ?? null;
    const productId = transactionInfo?.productId ?? renewalInfo?.productId ?? null;

    if (!originalTransactionId) {
      console.error('Apple notification: no originalTransactionId found');
      return new Response(
        JSON.stringify({ success: true, message: 'No transaction ID' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Find the subscription row by original_transaction_id, falling back to transaction_id
    const { data: subRow } = await supabase
      .from('iap_subscriptions')
      .select('id, user_id, transaction_id, original_transaction_id')
      .or(`original_transaction_id.eq.${originalTransactionId},transaction_id.eq.${originalTransactionId}`)
      .limit(1)
      .maybeSingle();

    if (!subRow) {
      console.log(`Apple notification: no matching subscription for originalTransactionId=${originalTransactionId}`);
      // Still return 200 so Apple doesn't retry
      return new Response(
        JSON.stringify({ success: true, message: 'No matching subscription' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Determine the new active state and expiry based on notification type
    let isActive = true;
    let expiresAt: string | null = null;

    if (EXPIRED_TYPES.has(notificationType)) {
      isActive = false;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
      }
    } else if (notificationType === 'CANCEL' || notificationType === 'REVOKE') {
      isActive = false;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
      }
    } else if (notificationType === 'REFUND') {
      isActive = false;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
      }
    } else if (notificationType === 'DID_RENEW') {
      isActive = true;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
      }
    } else if (notificationType === 'DID_CHANGE_RENEWAL_STATUS') {
      // subtype = 'AUTO_RENEW_OFF' means user turned off auto-renew, but sub stays active until expiry
      isActive = true;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
        if (new Date(expiresAt) <= new Date()) {
          isActive = false;
        }
      }
    } else if (notificationType === 'DID_FAIL_TO_RENEW') {
      // subtype = 'GRACE_PERIOD' means still active during grace, otherwise inactive
      isActive = subtype === 'GRACE_PERIOD';
    } else if (notificationType === 'GRACE_PERIOD_EXPIRED') {
      isActive = false;
    } else if (notificationType === 'PRICE_INCREASE') {
      // Keep current state, just log
      isActive = true;
    } else if (notificationType === 'SUBSCRIBED' || notificationType === 'OFFER_REDEEMED') {
      isActive = true;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
      }
    }

    // Update the subscription row
    const update: Record<string, any> = {
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    if (expiresAt) {
      update.expires_at = expiresAt;
    }

    if (transactionId && transactionId !== subRow.transaction_id) {
      update.transaction_id = transactionId;
    }

    if (!subRow.original_transaction_id && originalTransactionId) {
      update.original_transaction_id = originalTransactionId;
    }

    const { error: updateError } = await supabase
      .from('iap_subscriptions')
      .update(update)
      .eq('id', subRow.id);

    if (updateError) {
      console.error('Apple notification: DB update error:', updateError.message);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Apple notification: updated subscription ${subRow.id} -> isActive=${isActive}`);

    return new Response(
      JSON.stringify({ success: true, notificationType, isActive }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Apple server notification error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
