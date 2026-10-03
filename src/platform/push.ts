import type { ActiveTimer } from '../types';

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** SPEC §10: Web Push on iOS works only from the Home Screen. */
export const isStandalone = (): boolean =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const subscribe = async () =>
  (await navigator.serviceWorker.ready).pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(PUBLIC_KEY),
  });

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  return (await navigator.serviceWorker.ready).pushManager.getSubscription();
}

/** SPEC §7.2 step 1. Call it straight from a tap handler: iOS asks only in response to a tap. */
export async function subscribePush(): Promise<
  'granted' | 'denied' | 'not-standalone' | 'unsupported'
> {
  if (!isStandalone()) return 'not-standalone';
  if (!supported()) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  await subscribe();
  return 'granted';
}

/** SPEC §7.2: at startup, quietly recreate a lost subscription while permission holds. */
export async function renewSubscription(): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return;
  if (!(await currentSubscription())) await subscribe();
}

/** POST the remaining duration, never an absolute time: the Worker owns the clock. */
export async function scheduleRestPush(timer: ActiveTimer): Promise<boolean> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return false;
    const response = await fetch('/api/timer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        durationMs: Math.min(3_600_000, Math.max(1_000, Math.round(timer.endAt - Date.now()))),
        title: 'Recupero finito',
        body: timer.label.slice(0, 120),
      }),
    });
    return response.ok;
  } catch {
    return false; // offline: the in-app timer keeps working
  }
}

export async function cancelRestPush(): Promise<void> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await fetch('/api/timer', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch {
    // Offline: the notification may still arrive; nothing else depends on it.
  }
}
