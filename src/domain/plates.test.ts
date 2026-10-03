import { describe, expect, it } from 'vitest';
import { platesPerSide } from './plates';

describe('platesPerSide', () => {
  it('loads the biggest plates first on a 20 kg bar', () => {
    expect(platesPerSide(100)).toEqual({
      perSide: [
        { kg: 25, count: 1 },
        { kg: 15, count: 1 },
      ],
      remainderKg: 0,
    });
    expect(platesPerSide(140).perSide).toEqual([
      { kg: 25, count: 2 },
      { kg: 10, count: 1 },
    ]);
  });

  it('uses the small change plates', () => {
    expect(platesPerSide(82.5).perSide.map((p) => p.kg)).toEqual([25, 5, 1.25]);
  });

  it('handles other bars', () => {
    expect(platesPerSide(60, 15).perSide.map((p) => p.kg)).toEqual([20, 2.5]);
    expect(platesPerSide(20)).toEqual({ perSide: [], remainderKg: 0 });
  });

  it('reports loads it cannot build exactly, or below the bar', () => {
    expect(platesPerSide(61)).toEqual({ perSide: [{ kg: 20, count: 1 }], remainderKg: 1 });
    expect(platesPerSide(15)).toEqual({ perSide: [], remainderKg: -5 });
  });
});
