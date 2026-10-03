import { X } from 'lucide-react';
import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Tall sheet for long lists, e.g. the exercise picker. */
  full?: boolean;
  children: ReactNode;
}

const CLOSE_MS = 200;
/** Dragging the header down by more than this, or flicking it, closes the sheet. */
const DRAG_CLOSE_PX = 120;
const DRAG_CLOSE_SPEED = 0.6; // px per ms
/** Below this a touch is a tap: the close button keeps working. */
const DRAG_START_PX = 6;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Drag {
  startY: number;
  lastY: number;
  lastT: number;
  speed: number;
  active: boolean;
}

/**
 * Bottom sheet on the native <dialog>: focus trap, Esc and the top layer come for free. It slides
 * up when it opens, slides down before closing, and follows a downward drag of its header.
 */
export function Sheet({ open, onClose, title, full = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<Drag | null>(null);
  // Keeps the content while the sheet slides down: the parent's `open` is already false.
  const [shown, setShown] = useState(open);
  // Many callers gate `title`/`children` on the same state that flips `open` to false (e.g. an
  // `item` becoming null), so while closing those props already collapsed to empty. Freeze the
  // last open render's content and keep showing it until the slide-down finishes. Updating state
  // during render (not in an effect) is the documented way to derive it from props without an
  // extra render: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [frozen, setFrozen] = useState({ title, children });
  if (open && (frozen.title !== title || frozen.children !== children)) {
    setFrozen({ title, children });
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setShown(true);
      dialog.removeAttribute('data-closing');
      dialog.style.transform = '';
      dialog.style.transition = '';
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) {
      setShown(false);
      return;
    }
    dialog.setAttribute('data-closing', '');
    const timer = setTimeout(
      () => {
        dialog.close();
        dialog.removeAttribute('data-closing');
        dialog.style.transform = '';
        setShown(false);
      },
      reducedMotion() ? 0 : CLOSE_MS,
    );
    return () => clearTimeout(timer);
  }, [open]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      speed: 0,
      active: false,
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const dialog = ref.current;
    if (!d || !dialog) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (dy < DRAG_START_PX) return;
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      dialog.style.transition = 'none';
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.speed = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    dialog.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    const dialog = ref.current;
    if (!d?.active || !dialog) return;
    if (e.clientY - d.startY > DRAG_CLOSE_PX || d.speed > DRAG_CLOSE_SPEED) {
      onClose(); // the closing slide starts from where the finger left it
      return;
    }
    dialog.style.transition = `transform ${CLOSE_MS}ms var(--ease-out)`;
    dialog.style.transform = '';
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: closes on backdrop taps; Esc closes natively
    <dialog
      ref={ref}
      className={`sheet ${full ? 'h-[92dvh]' : ''}`}
      // Only a native close (Esc) reports back. When the parent closed us, its state already moved
      // on, possibly to another sheet: calling onClose again would close that one.
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {shown && (
        <div
          className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]"
          // While sliding down the sheet still shows the last open content, but it must not react
          // to a stray tap on what is now frozen, stale state.
          inert={!open}
        >
          <div
            className="touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <div className="flex justify-center pt-2" aria-hidden="true">
              <span className="h-[5px] w-9 rounded-full bg-fumo/50" />
            </div>
            <div className="flex min-h-14 items-center gap-2 pr-1 pl-4">
              <h2 className="plate flex-1 text-title">{frozen.title}</h2>
              <button
                type="button"
                aria-label="Chiudi"
                className="flex size-14 items-center justify-center text-fumo active:text-luce"
                onClick={onClose}
              >
                <X />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-4">{frozen.children}</div>
        </div>
      )}
    </dialog>
  );
}
