/**
 * Safe wrappers around Capacitor native plugins.
 * All functions are no-ops when running in a browser / PWA context.
 */

import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

// ---- Haptics ----------------------------------------------------------------

export async function hapticLight() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export async function hapticMedium() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export async function hapticHeavy() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}

export async function hapticSuccess() {
  if (!isNative()) return;
  const { Haptics, NotificationType } = await import('@capacitor/haptics');
  await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export async function hapticWarning() {
  if (!isNative()) return;
  const { Haptics, NotificationType } = await import('@capacitor/haptics');
  await Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

// ---- Status bar -------------------------------------------------------------

export async function initStatusBar() {
  if (!isNative()) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
}

// ---- Local Notifications ----------------------------------------------------

let notificationPermission: 'granted' | 'denied' | 'unknown' = 'unknown';

export async function requestNotificationPermission() {
  if (!isNative()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const result = await LocalNotifications.requestPermissions().catch(() => ({ display: 'denied' as const }));
  notificationPermission = result.display === 'granted' ? 'granted' : 'denied';
}

let nextNotificationId = 1000;

/**
 * Schedule a local notification to fire after `seconds` from now.
 * Returns the notification id so it can be cancelled.
 */
export async function scheduleRestTimerNotification(seconds: number): Promise<number | null> {
  if (!isNative()) return null;
  if (notificationPermission === 'denied') return null;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const id = nextNotificationId++;
  const at = new Date(Date.now() + seconds * 1000);
  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: 'IronGrid',
      body: 'Hvile ferdig! Tid for neste sett.',
      schedule: { at },
      sound: undefined,
      actionTypeId: '',
      extra: null,
    }],
  }).catch(() => {});
  return id;
}

export async function cancelNotification(id: number | null) {
  if (!isNative() || id === null) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
}

// ---- Keep Awake -------------------------------------------------------------

export async function keepScreenAwake(_on: boolean) {
  // Requires @capacitor-community/keep-awake installed separately.
  // If you add it: npm install @capacitor-community/keep-awake
  // Then uncomment the block below and remove this stub.
  //
  // if (!isNative()) return;
  // const { KeepAwake } = await import('@capacitor-community/keep-awake');
  // if (on) { await KeepAwake.keepAwake().catch(() => {}); }
  // else    { await KeepAwake.allowSleep().catch(() => {}); }
}

// ---- Splash screen ----------------------------------------------------------

export async function hideSplash() {
  if (!isNative()) return;
  const { SplashScreen } = await import('@capacitor/splash-screen');
  await SplashScreen.hide().catch(() => {});
}
