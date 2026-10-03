import { z } from 'zod';

const DESKTOP_TEST_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com'];

/** SPEC §7.2: https only, Apple push hosts plus two desktop services used for testing. */
export function isAllowedEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    (url.hostname.endsWith('.push.apple.com') || DESKTOP_TEST_HOSTS.includes(url.hostname))
  );
}

const endpoint = z.string().max(1000).refine(isAllowedEndpoint);

export const timerRequest = z.object({
  subscription: z.object({
    endpoint,
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  durationMs: z.number().int().min(1_000).max(3_600_000),
  title: z.string().min(1).max(60),
  body: z.string().max(120),
});

export const cancelRequest = z.object({ endpoint });

export type TimerRequest = z.infer<typeof timerRequest>;

/** Durable Object name. Only whoever knows the subscription can schedule pushes to it. */
export async function endpointId(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
