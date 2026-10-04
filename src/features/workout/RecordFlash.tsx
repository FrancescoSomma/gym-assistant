import { Trophy } from 'lucide-react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Tab } from '../../components/Tab';
import { formatRecord, RECORD_LABELS, type RecordKind } from '../../domain/records';

export interface Flash {
  /** Changes on every record, so two records in a row each wipe in. */
  id: number;
  kind: RecordKind;
  value: number;
}

const SHOW_MS = 2500;

/**
 * Yellow lower third over the workout nav when a confirmed set is a personal record (spec §8.2).
 * Render it inside a `relative` nav. The always-mounted live wrapper lets taps through, so the
 * nav buttons stay usable when nothing shows; the panel covers them for 2,5 s and a tap on it
 * dismisses it. Announced politely. onDone must be stable (useCallback).
 */
export function RecordFlash({ flash, onDone }: { flash: Flash | null; onDone: () => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [flash, onDone]);
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-0 z-20">
      <AnimatePresence>
        {flash && (
          <m.button
            type="button"
            key={flash.id}
            onClick={onDone}
            initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute inset-0 flex items-stretch bg-tribuna text-left"
          >
            <Tab tone="record">
              <Trophy size={20} aria-hidden="true" />
            </Tab>
            <span className="flex flex-1 items-center justify-between gap-3 px-3 py-1">
              <span className="leading-tight">
                <span className="block font-semibold">Record</span>
                <span className="block text-small text-fumo">{RECORD_LABELS[flash.kind]}</span>
              </span>
              <span className="num text-score text-plate-yellow">
                {formatRecord(flash.kind, flash.value)}
              </span>
            </span>
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}
