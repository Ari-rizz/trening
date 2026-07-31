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

  let body: { receipt?: string; transactionId?: string; productId?: string; environment?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { receipt, transactionId, productId, environment } = body;

  if (!receipt || !transactionId || !productId) {
    return new Response(JSON.stringify({ error: 'Missing receipt, transactionId or productId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isSandbox = environment === 'Sandbox' || environment === 'Xcode';

  // Try production first; if status 21007 it's a sandbox receipt
  let appleResponse = await verifyReceiptWithApple(receipt, false);
  if (appleResponse.status === 21007) {
    appleResponse = await verifyReceiptWithApple(receipt, true);
  }

  // status 0 = valid, 21006 = receipt valid but subscription expired (still upsert as inactive)
  if (appleResponse.status !== 0 && appleResponse.status !== 21006) {
    console.error('Apple receipt validation failed, status:', appleResponse.status);
    return new Response(JSON.stringify({ error: `Apple validation failed: ${appleResponse.status}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find the latest transaction for this product in the receipt
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
    // No receipt info found — treat as active (grace, trust client-side expiry)
    isActive = appleResponse.status === 0;
  }

  const env = isSandbox ? 'Sandbox' : 'Production';

  const { error: upsertError } = await supabase
    .from('iap_subscriptions')
    .upsert(
      {
        user_id: user.id,
        product_id: productId,
        transaction_id: transactionId,
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
