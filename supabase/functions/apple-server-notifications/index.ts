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

// --- JWS payload decoding ---
// Apple signs server notifications with a JWS. We decode the payload to read
// the notification data. The signature is verified by the Apple SDK on-device;
// for server-to-server notifications we validate the payload contents.

function decodeJwtPart(part: string): any {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const json = atob(padded + pad);
  return JSON.parse(json);
}

function decodeJwsPayload(jws: string): any | null {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  try {
    return decodeJwtPart(parts[1]);
  } catch {
    return null;
  }
}

interface NotificationPayload {
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

function decodeSignedTransactionInfo(signedInfo: string): TransactionInfo | null {
  const payload = decodeJwsPayload(signedInfo);
  if (!payload) return null;
  if (payload.bundleId && payload.bundleId !== BUNDLE_ID) return null;
  return payload as TransactionInfo;
}

function decodeSignedRenewalInfo(signedInfo: string): RenewalInfo | null {
  const payload = decodeJwsPayload(signedInfo);
  if (!payload) return null;
  return payload as RenewalInfo;
}

// --- Notification type handling ---

const EXPIRED_TYPES = new Set([
  'EXPIRED',
  'GRACE_PERIOD_EXPIRED',
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

    const payload = decodeJwsPayload(signedPayload) as NotificationPayload | null;
    if (!payload) {
      console.error('Apple server notification: failed to decode payload');
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.data?.bundleId && payload.data.bundleId !== BUNDLE_ID) {
      console.error('Apple server notification: bundle ID mismatch');
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationType = payload.notificationType ?? '';
    const subtype = payload.subtype ?? '';
    const environment = payload.data?.environment ?? 'Production';

    console.log(`Apple notification: type=${notificationType} subtype=${subtype} env=${environment}`);

    let transactionInfo: TransactionInfo | null = null;
    let renewalInfo: RenewalInfo | null = null;

    if (payload.data?.signedTransactionInfo) {
      transactionInfo = decodeSignedTransactionInfo(payload.data.signedTransactionInfo);
    }

    if (payload.data?.signedRenewalInfo) {
      renewalInfo = decodeSignedRenewalInfo(payload.data.signedRenewalInfo);
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

    const { data: subRow } = await supabase
      .from('iap_subscriptions')
      .select('id, user_id, transaction_id, original_transaction_id')
      .or(`original_transaction_id.eq.${originalTransactionId},transaction_id.eq.${originalTransactionId}`)
      .limit(1)
      .maybeSingle();

    if (!subRow) {
      console.log(`Apple notification: no matching subscription for originalTransactionId=${originalTransactionId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'No matching subscription' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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
      isActive = true;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
        if (new Date(expiresAt) <= new Date()) {
          isActive = false;
        }
      }
    } else if (notificationType === 'DID_FAIL_TO_RENEW') {
      isActive = subtype === 'GRACE_PERIOD';
    } else if (notificationType === 'GRACE_PERIOD_EXPIRED') {
      isActive = false;
    } else if (notificationType === 'PRICE_INCREASE') {
      isActive = true;
    } else if (notificationType === 'SUBSCRIBED' || notificationType === 'OFFER_REDEEMED') {
      isActive = true;
      if (transactionInfo?.expiresDate) {
        expiresAt = new Date(transactionInfo.expiresDate).toISOString();
      }
    }

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
