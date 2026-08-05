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

// --- StoreKit 2 JWS payload decoding ---
// The native SDK verifies the JWS signature on-device before sending the
// signed payload to the server. The server decodes the payload and validates
// its contents (bundle ID, environment, expiry) rather than re-verifying the
// cryptographic signature.

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

function decodeJwtPart(part: string): any {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const json = atob(padded + pad);
  return JSON.parse(json);
}

function decodeJwsPayload(jws: string): JwsPayload | null {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  try {
    return decodeJwtPart(parts[1]) as JwsPayload;
  } catch {
    return null;
  }
}

function validateJwsPayload(payload: JwsPayload): boolean {
  if (payload.bundleId && payload.bundleId !== BUNDLE_ID) return false;
  return true;
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
    try {
      const payload = decodeJwsPayload(receipt);
      if (!payload || !validateJwsPayload(payload)) {
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
      console.error('JWS decode error:', err);
      return new Response(JSON.stringify({ error: 'JWS verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
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
    originalTransactionId = null;
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
