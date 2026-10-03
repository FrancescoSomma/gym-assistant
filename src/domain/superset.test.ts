import { describe, expect, it } from 'vitest';
import { supersetNext, supersetRun, toggleSupersetLink } from './superset';

describe('supersetRun', () => {
  it('returns the contiguous run with the same key', () => {
    expect(supersetRun(['a', 'a', undefined, 'b'], 1)).toEqual([0, 1]);
    expect(supersetRun(['a', 'a', undefined, 'b'], 2)).toEqual([2]);
  });
  it('non-contiguous keys: separated exercises are not one superset', () => {
    expect(supersetRun(['a', 'a', undefined, 'a'], 3)).toEqual([3]);
  });
});

describe('supersetNext', () => {
  it('moves to the next member with work left, without rest', () => {
    expect(supersetNext([true, true], 0)).toEqual({ next: 1, roundEnd: false });
  });
  it('ends the round on the last member and goes back to the first with work left', () => {
    expect(supersetNext([true, true], 1)).toEqual({ next: 0, roundEnd: true });
  });
  it('uneven superset: a lone member ends the round at every set', () => {
    expect(supersetNext([true, false], 0)).toEqual({ next: 0, roundEnd: true });
  });
  it('returns null when every member is done', () => {
    expect(supersetNext([false, false], 1)).toEqual({ next: null, roundEnd: true });
  });
});

describe('toggleSupersetLink', () => {
  const keys = ['k1', 'k2', 'k3', 'k4'];
  const counter = () => {
    let n = 0;
    return () => keys[n++] ?? 'extra';
  };

  it('links two free exercises with a new key', () => {
    expect(toggleSupersetLink([undefined, undefined, undefined], 0, counter())).toEqual([
      'k1',
      'k1',
      undefined,
    ]);
  });
  it('extends an existing superset', () => {
    expect(toggleSupersetLink(['x', 'x', undefined], 1, counter())).toEqual(['x', 'x', 'x']);
  });
  it('unlinks the first member', () => {
    expect(toggleSupersetLink(['x', 'x', 'x'], 0, counter())).toEqual([undefined, 'x', 'x']);
  });
  it('splitting a run gives each part its own key', () => {
    expect(toggleSupersetLink(['x', 'x', 'x', 'x'], 1, counter())).toEqual(['x', 'x', 'k1', 'k1']);
  });
});
