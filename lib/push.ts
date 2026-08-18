import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

export type PushPlatform = 'ios' | 'android' | 'web';

export function detectPlatform(): PushPlatform {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    return platform === 'ios' ? 'ios' : 'android';
  }
  return 'web';
}

export async function registerPushNotifications(): Promise<boolean> {
  const platform = detectPlatform();

  if (platform === 'web') {
    return registerWebPush();
  }

  return registerNativePush(platform);
}

async function registerNativePush(_platform: PushPlatform): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return false;

    await PushNotifications.register();
    return true;
  } catch {
    return false;
  }
}

async function registerWebPush(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (!('Notification' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await saveWebPushSubscription(existing);
      return true;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: getVapidPublicKey(),
    });
    await saveWebPushSubscription(sub);
    return true;
  } catch {
    return false;
  }
}

function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
}

async function saveWebPushSubscription(sub: PushSubscription): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const subJson = sub.toJSON();
  await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: session.user.id,
      platform: 'web',
      endpoint: subJson.endpoint,
      token: JSON.stringify(subJson.keys ?? {}),
      keys: subJson.keys ?? {},
    }, { onConflict: 'user_id,endpoint' });
}

export async function getNotificationPreferences() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  return data;
}

export async function updateNotificationPreferences(
  prefs: Partial<{
    rest_timer: boolean;
    weight_reminder: boolean;
    workout_reminder: boolean;
    goal_reminder: boolean;
    reminder_time: string;
    weight_reminder_time: string;
    workout_reminder_time: string;
  }>
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('notification_preferences')
      .update(prefs)
      .eq('id', existing.id);
  } else {
    await supabase
      .from('notification_preferences')
      .insert({ user_id: session.user.id, ...prefs });
  }
}
