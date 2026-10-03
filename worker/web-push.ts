import { buildPushPayload } from '@block65/webcrypto-web-push';
import type { TimerRequest } from './validate';

/** One rest-timer notification: VAPID (RFC 8292) and an aes128gcm payload (RFC 8291). */
export async function sendRestPush(job: TimerRequest, env: Env): Promise<Response> {
  const payload = await buildPushPayload(
    // A rest notification minutes late is useless: TTL 60. High urgency asks for immediate delivery.
    { data: { title: job.title, body: job.body }, options: { ttl: 60, urgency: 'high' } },
    { endpoint: job.subscription.endpoint, expirationTime: null, keys: job.subscription.keys },
    {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    },
  );
  return fetch(job.subscription.endpoint, payload);
}
