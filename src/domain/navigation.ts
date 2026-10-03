export type EnterMotion = 'none' | 'fade' | 'forward' | 'back';

const TAB_ROOTS = new Set(['/', '/programs', '/history', '/progress']);

/**
 * How a screen enters: nothing on launch, a slide back for back links and history pops, a fade
 * between tabs and after replacements, a slide in for everything pushed on top.
 */
export function enterMotion(nav: {
  pathname: string;
  /** React Router's navigation type: "POP", "PUSH" or "REPLACE". */
  navigationType: string;
  /** The link asked to go back (state.dir === 'back'). */
  back: boolean;
  /** First location since launch. */
  initial: boolean;
}): EnterMotion {
  if (nav.initial) return 'none';
  if (nav.back || nav.navigationType === 'POP') return 'back';
  if (nav.navigationType === 'REPLACE' || TAB_ROOTS.has(nav.pathname)) return 'fade';
  return 'forward';
}
