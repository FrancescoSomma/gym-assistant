import { useEffect, useState } from 'react';

/**
 * Current time, re-rendering every intervalMs and on every return to the foreground. The state
 * only schedules re-renders: reading Date.now() here keeps the first render after a pause (e.g. a
 * rest timer that just started) from showing a time that is minutes old.
 */
export function useNow(intervalMs: number | null): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (intervalMs === null) return;
    const tick = () => setTick((n) => n + 1);
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return Date.now();
}
