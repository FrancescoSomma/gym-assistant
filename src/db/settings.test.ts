import { describe, expect, it } from 'vitest';
import { getSettings, setSetting } from './settings';

describe('settings', () => {
  it('returns the SPEC §4.2 defaults when nothing is stored', async () => {
    const s = await getSettings();
    expect(s.activeProgramId).toBeNull();
    expect(s.weeklyGoal).toBe(3);
    expect(s.defaultRestSec).toBe(90);
    expect(s.autoStartTimer).toBe(true);
    expect(s.weightSteps).toEqual({
      barbell: 2.5,
      dumbbell: 2,
      machine: 5,
      cable: 2.5,
      bodyweight: 2.5,
      other: 2.5,
    });
    expect(s.activeTimer).toBeNull();
  });

  it('stored values override the defaults', async () => {
    await setSetting('weeklyGoal', 4);
    await setSetting('activeTimer', {
      sessionExerciseId: 'x',
      endAt: 10,
      durationMs: 5,
      label: 'l',
    });
    const s = await getSettings();
    expect(s.weeklyGoal).toBe(4);
    expect(s.activeTimer?.endAt).toBe(10);
  });
});
