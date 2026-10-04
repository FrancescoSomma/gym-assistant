import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Counts from zero up to value once, on mount (the results scoreboard). Tabular figures keep
 * the width steady. Decorative: the container carries the final value for assistive technology.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [value, reduced]);
  return <span aria-hidden="true">{format(shown)}</span>;
}
