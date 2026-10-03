import { describe, expect, it } from 'vitest';
import { enterMotion } from './navigation';

const nav = (pathname: string, navigationType: string, back = false, initial = false) =>
  enterMotion({ pathname, navigationType, back, initial });

describe('enterMotion', () => {
  it('shows the first screen after launch without an entrance', () => {
    expect(nav('/history/abc', 'POP', false, true)).toBe('none');
  });
  it('fades between tabs and after a replace', () => {
    expect(nav('/programs', 'PUSH')).toBe('fade');
    expect(nav('/', 'PUSH')).toBe('fade');
    expect(nav('/history/abc', 'REPLACE')).toBe('fade');
  });
  it('slides in what is pushed on top', () => {
    expect(nav('/programs/p1/days/d1', 'PUSH')).toBe('forward');
  });
  it('slides back for back links and history pops, onto tabs too', () => {
    expect(nav('/programs', 'PUSH', true)).toBe('back');
    expect(nav('/history/abc', 'POP')).toBe('back');
  });
});
