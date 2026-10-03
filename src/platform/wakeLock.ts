import { useEffect } from 'react';

/** Keeps the screen on while mounted. iOS drops the lock when the page hides: re-acquire. */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (disposed) await lock.release();
      } catch {
        // Not granted (low battery, older iOS): the screen may sleep, nothing else breaks.
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release();
    };
  }, []);
}
