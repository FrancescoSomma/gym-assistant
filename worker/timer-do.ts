import { DurableObject } from 'cloudflare:workers';
import type { TimerRequest } from './validate';

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
    await this.ctx.storage.deleteAll(); // sending arrives in Task 2
  }
}
