import { DurableObject } from 'cloudflare:workers';
import type { TimerRequest } from './validate';
import { sendRestPush } from './web-push';

/** One instance per push subscription, holding at most one pending rest timer (one alarm). */
export class TimerDO extends DurableObject<Env> {
  async schedule(job: TimerRequest): Promise<void> {
    await this.ctx.storage.put('job', job);
    // The deadline comes from the Worker's clock: phone/server skew cannot move it (SPEC §7.2).
    await this.ctx.storage.setAlarm(Date.now() + job.durationMs);
  }

  async cancel(): Promise<void> {
    await this.ctx.storage.deleteAll(); // also removes the alarm (compatibility date >= 2026-02-24)
  }

  async alarm(): Promise<void> {
    const job = await this.ctx.storage.get<TimerRequest>('job');
    // ponytail: state is cleared before sending, so an expired subscription (404/410) needs no
    // extra cleanup and a rejected push is not retried; with TTL 60 a retry would be late anyway.
    await this.ctx.storage.deleteAll();
    if (!job) return;
    const response = await sendRestPush(job, this.env);
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      // Status and reason only: never the subscription or the payload.
      console.warn('Push rejected', response.status, await response.text());
    }
  }
}
