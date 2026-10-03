import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Tall sheet for long lists, e.g. the exercise picker. */
  full?: boolean;
  children: ReactNode;
}

/** Bottom sheet on the native <dialog>: focus trap, Esc and the top layer come for free. */
export function Sheet({ open, onClose, title, full = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
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
      {open && (
        <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex min-h-14 items-center gap-2 pr-1 pl-4">
            <h2 className="flex-1 text-title font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Chiudi"
              className="flex size-11 items-center justify-center text-steel"
              onClick={onClose}
            >
              <X />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
