import { supabase } from './supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Ikke innlogget');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Apikey: SUPABASE_ANON_KEY,
  };
}

export async function createCheckoutSession(
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode: 'subscription',
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? 'Kunne ikke opprette betalingssesjon');
  }
  return json.url as string;
}

export async function cancelSubscription(): Promise<{ current_period_end: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
    method: 'POST',
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? 'Kunne ikke kansellere abonnementet');
  }
  return json as { current_period_end: number };
}
