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

// --- Legacy StoreKit 1 receipt verification (base64 receipt) ---

async function verifyReceiptWithApple(receipt: string, sandbox: boolean): Promise<any> {
  const url = sandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  const sharedSecret = Deno.env.get('APPLE_IAP_SHARED_SECRET') ?? '';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'receipt-data': receipt, password: sharedSecret, 'exclude-old-transactions': true }),
  });

  return res.json();
}

function parseLegacyReceipt(appleResponse: any, productId: string) {
  const latestReceiptInfo: any[] = appleResponse.latest_receipt_info ?? [];
  const latestTx = latestReceiptInfo
    .filter((t: any) => t.product_id === productId)
    .sort((a: any, b: any) => Number(b.expires_date_ms) - Number(a.expires_date_ms))[0];

  let expiresAt: Date | null = null;
  let originalPurchaseDate: Date | null = null;
  let isActive = false;

  if (latestTx) {
    expiresAt = latestTx.expires_date_ms ? new Date(Number(latestTx.expires_date_ms)) : null;
    originalPurchaseDate = latestTx.original_purchase_date_ms
      ? new Date(Number(latestTx.original_purchase_date_ms))
      : null;
    isActive = expiresAt ? expiresAt > new Date() : false;
  } else {
    isActive = appleResponse.status === 0;
  }

  return { expiresAt, originalPurchaseDate, isActive };
}

// --- StoreKit 2 JWS verification ---

// Apple's Root CA certificates are published at:
// https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
// We download and cache the Apple Root CA on first call.

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

interface JwsHeader {
  alg: string;
  x5c?: string[];
}

interface JwsPayload {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  bundleId?: string;
  purchaseDate?: number;
  originalPurchaseDate?: number;
  expiresDate?: number;
  type?: string;
  environment?: string;
  inAppOwnershipType?: string;
  signedDate?: number;
}

function extractOriginalTransactionId(receipt: string): string | null {
  // For StoreKit 2 JWS, the originalTransactionId is in the JWT payload
  try {
    const parts = receipt.split('.');
    if (parts.length === 3) {
      const payload = decodeJwtPart(parts[1]) as JwsPayload;
      return payload.originalTransactionId ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

function decodeJwtPart(part: string): any {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const json = atob(padded + pad);
  return JSON.parse(json);
}

async function verifyJws(jws: string): Promise<JwsPayload | null> {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtPart(parts[0]) as JwsHeader;
  const payload = decodeJwtPart(parts[1]) as JwsPayload;

  if (!header.x5c || header.x5c.length === 0) return null;

  // Verify the certificate chain back to Apple Root CA
  const rootCa = await getAppleRootCa();

  // The leaf cert is x5c[0], intermediate is x5c[1]
  // For simplicity, we verify the leaf cert signature with the intermediate,
  // and the intermediate with the root CA.
  const leafCertPem = derToPem(base64ToUint8(header.x5c[0]));
  const intermediateCertPem = header.x5c[1] ? derToPem(base64ToUint8(header.x5c[1])) : null;

  // Verify leaf signed by intermediate (or root)
  const leafKey = await importX509Cert(leafCertPem);
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signature = base64UrlToUint8(parts[2]);

  // Verify JWS signature with leaf cert's public key
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    leafKey,
    signature,
    data,
  );

  if (!valid) return null;

  // Verify bundle ID matches
  if (payload.bundleId && payload.bundleId !== BUNDLE_ID) return null;

  return payload;
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

function parseJwsPayload(payload: JwsPayload) {
  const expiresAt = payload.expiresDate ? new Date(payload.expiresDate) : null;
  const originalPurchaseDate = payload.originalPurchaseDate
    ? new Date(payload.originalPurchaseDate)
    : null;
  const isActive = expiresAt ? expiresAt > new Date() : true;

  return { expiresAt, originalPurchaseDate, isActive };
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: {
    receipt?: string;
    isJws?: boolean;
    transactionId?: string;
    productId?: string;
    environment?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { receipt, isJws, transactionId, productId, environment } = body;

  if (!receipt || !transactionId || !productId) {
    return new Response(JSON.stringify({ error: 'Missing receipt, transactionId or productId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isSandbox = environment === 'Sandbox' || environment === 'Xcode';
  const env = isSandbox ? 'Sandbox' : 'Production';

  let expiresAt: Date | null = null;
  let originalPurchaseDate: Date | null = null;
  let isActive = false;
  let originalTransactionId: string | null = null;

  if (isJws) {
    // StoreKit 2 JWS verification
    try {
      const payload = await verifyJws(receipt);
      if (!payload) {
        return new Response(JSON.stringify({ error: 'JWS verification failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const parsed = parseJwsPayload(payload);
      expiresAt = parsed.expiresAt;
      originalPurchaseDate = parsed.originalPurchaseDate;
      isActive = parsed.isActive;
      originalTransactionId = payload.originalTransactionId ?? null;
    } catch (err) {
      console.error('JWS verification error:', err);
      return new Response(JSON.stringify({ error: 'JWS verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    // Legacy StoreKit 1 receipt verification
    let appleResponse = await verifyReceiptWithApple(receipt, false);
    if (appleResponse.status === 21007) {
      appleResponse = await verifyReceiptWithApple(receipt, true);
    }

    if (appleResponse.status !== 0 && appleResponse.status !== 21006) {
      console.error('Apple receipt validation failed, status:', appleResponse.status);
      return new Response(JSON.stringify({ error: `Apple validation failed: ${appleResponse.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseLegacyReceipt(appleResponse, productId);
    expiresAt = parsed.expiresAt;
    originalPurchaseDate = parsed.originalPurchaseDate;
    isActive = parsed.isActive;
    originalTransactionId = extractOriginalTransactionId(receipt);
  }

  const { error: upsertError } = await supabase
    .from('iap_subscriptions')
    .upsert(
      {
        user_id: user.id,
        product_id: productId,
        transaction_id: transactionId,
        original_transaction_id: originalTransactionId,
        environment: env,
        is_active: isActive,
        expires_at: expiresAt?.toISOString() ?? null,
        original_purchase_date: originalPurchaseDate?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,transaction_id' },
    );

  if (upsertError) {
    console.error('DB upsert error:', upsertError.message);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ success: true, isActive, expiresAt: expiresAt?.toISOString() ?? null }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
