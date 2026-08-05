import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { supabase } from './supabase';

export const IAP_PRODUCT_ID = 'no.irongrid.app.monthly';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getIAPProduct() {
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [IAP_PRODUCT_ID],
    productType: PURCHASE_TYPE.SUBS,
  });
  return products[0] ?? null;
}

export async function purchaseIAP(): Promise<{ success: boolean; error?: string }> {
  try {
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: IAP_PRODUCT_ID,
      productType: PURCHASE_TYPE.SUBS,
    });

    const receipt = transaction.receipt ?? transaction.jwsRepresentation;
    if (!receipt) {
      return { success: false, error: 'Ingen kvittering mottatt fra App Store' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: 'Ikke innlogget' };
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-apple-receipt`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          receipt,
          isJws: !transaction.receipt,
          transactionId: transaction.transactionId,
          productId: IAP_PRODUCT_ID,
          environment: transaction.environment ?? 'Production',
        }),
      },
    );

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error ?? 'Validering feilet' };
    }

    return { success: true };
  } catch (err: any) {
    if (err?.code === 'E_USER_CANCELLED' || err?.message?.includes('cancelled')) {
      return { success: false, error: 'CANCELLED' };
    }
    return { success: false, error: err?.message ?? 'Kjøp feilet' };
  }
}

export async function restoreIAPPurchases(): Promise<{ success: boolean; isActive: boolean; error?: string }> {
  try {
    await NativePurchases.restorePurchases();

    const { purchases } = await NativePurchases.getPurchases({ onlyCurrentEntitlements: true });
    const activeSub = purchases.find(
      (p) => p.productIdentifier === IAP_PRODUCT_ID && p.isActive,
    );

    if (!activeSub) {
      return { success: true, isActive: false };
    }

    const receipt = activeSub.receipt ?? activeSub.jwsRepresentation;
    if (!receipt) {
      return { success: true, isActive: false };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { success: true, isActive: false };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-apple-receipt`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          receipt,
          isJws: !activeSub.receipt,
          transactionId: activeSub.transactionId,
          productId: IAP_PRODUCT_ID,
          environment: activeSub.environment ?? 'Production',
        }),
      },
    );

    const json = await res.json();
    return { success: true, isActive: json.isActive === true };
  } catch (err: any) {
    return { success: false, isActive: false, error: err?.message };
  }
}

export async function checkActiveIAPSubscription(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('iap_subscriptions')
    .select('is_active, expires_at')
    .eq('user_id', userId)
    .eq('product_id', IAP_PRODUCT_ID)
    .eq('is_active', true)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  if (!data.expires_at) return data.is_active;
  return new Date(data.expires_at) > new Date();
}

export async function openSubscriptionManagement(): Promise<void> {
  await NativePurchases.manageSubscriptions();
}
