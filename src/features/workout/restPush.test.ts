import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSetting } from '../../db/settings';
import { cancelRestPush, scheduleRestPush } from '../../platform/push';
import { syncRestPush } from './restPush';

vi.mock('../../platform/push', () => ({ scheduleRestPush: vi.fn(), cancelRestPush: vi.fn() }));

const timer = { sessionExerciseId: 'se', endAt: 1, durationMs: 1, label: 'Panca' };

describe('syncRestPush', () => {
  beforeEach(async () => {
    vi.mocked(scheduleRestPush).mockReset();
    vi.mocked(cancelRestPush).mockReset();
    await setSetting('pushEnabled', true);
  });

  it('sends requests in call order, even when an earlier one is slow', async () => {
    const order: string[] = [];
    let finishPost = () => {};
    vi.mocked(scheduleRestPush).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPost = () => {
            order.push('post');
            resolve(true);
          };
        }),
    );
    vi.mocked(cancelRestPush).mockImplementation(async () => {
      order.push('delete');
    });

    void syncRestPush(timer);
    const last = syncRestPush(null); // "Salta" right after confirming a set
    await vi.waitFor(() => expect(scheduleRestPush).toHaveBeenCalled());
    expect(cancelRestPush).not.toHaveBeenCalled();
    finishPost();
    await last;
    expect(order).toEqual(['post', 'delete']);
  });

  it('keeps going after a failed request', async () => {
    vi.mocked(scheduleRestPush).mockRejectedValue(new Error('offline'));
    void syncRestPush(timer);
    await syncRestPush(null);
    expect(cancelRestPush).toHaveBeenCalledOnce();
  });
});
