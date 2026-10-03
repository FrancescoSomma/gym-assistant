import { describe, expect, it } from 'vitest';
import { deleteBodyweight, listBodyweights, saveBodyweight } from './bodyweights';

describe('bodyweights', () => {
  it('keeps one measurement per day, newest first', async () => {
    await saveBodyweight('2026-10-01', 80.4);
    await saveBodyweight('2026-10-02', 80.1);
    await saveBodyweight('2026-10-02', 79.9); // same day: replaces
    const list = await listBodyweights();
    expect(list.map((b) => [b.date, b.kg])).toEqual([
      ['2026-10-02', 79.9],
      ['2026-10-01', 80.4],
    ]);
    await deleteBodyweight(list[0]?.id ?? '');
    expect(await listBodyweights()).toHaveLength(1);
  });
});
