import { Minus, Plus } from 'lucide-react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { formatNumber, parseInteger, parseWeight } from '../domain/format';
import { RollingNumber } from './RollingNumber';

interface Props {
  /** Accessible name, e.g. "Peso". */
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step: number;
  min?: number;
  max?: number;
  /** Value set by the first ± tap when the field is empty. */
  fallback?: number;
  /** Weight: accepts "82,5" and "82.5". */
  decimal?: boolean;
  unit?: string;
  placeholder?: string;
  /** lg: 56pt targets and 44px values for workout mode. */
  size?: 'md' | 'lg';
  /**
   * Save every valid keystroke, not only on blur (workout mode: a forced close keeps what was
   * typed, and "Conferma serie" enables while the keyboard is still open). Not for fields that
   * adjust each other, like minimum and maximum reps.
   */
  live?: boolean;
}

export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  fallback = min,
  decimal = false,
  unit,
  placeholder,
  size = 'md',
  live = false,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  /** Typed text as a number: undefined when empty, null when it is not a number. */
  const parse = (text: string) =>
    text.trim() === '' ? undefined : ((decimal ? parseWeight(text) : parseInteger(text)) ?? null);
  const write = (text: string) => {
    const n = parse(text);
    if (n !== null) onChange(n === undefined ? undefined : clamp(n));
  };
  const commit = () => {
    if (draft === null) return;
    write(draft);
    setDraft(null); // invalid text: back to the stored value
  };
  // While typing, ± starts from the typed number: the stored one may not have caught up yet.
  const bump = (delta: number) => {
    const typed = draft === null ? value : parse(draft);
    const base = typed === null ? value : typed;
    setDraft(null);
    onChange(base === undefined ? fallback : clamp(base + delta));
  };
  // Closing a sheet or the set editor removes the field without a blur: keep what was typed.
  const commitOnUnmount = useRef(commit);
  commitOnUnmount.current = commit;
  useEffect(() => () => commitOnUnmount.current(), []);
  // ± must not take the focus: the blur would save the draft after bump read the old value.
  const keepFocus = (e: PointerEvent) => e.preventDefault();

  const lg = size === 'lg';
  const box = lg ? 'h-14' : 'h-11';
  const button = `flex ${box} ${lg ? 'w-14' : 'w-11'} shrink-0 items-center justify-center rounded-control bg-fondale text-luce transition-transform duration-120 ease-out active:scale-[0.94] disabled:opacity-30 disabled:active:scale-100`;
  const text = lg ? 'text-value' : 'text-step';
  const shown = value === undefined ? '' : formatNumber(value);
  // At rest the digits roll on ± (RollingNumber over a transparent input); typing shows the input.
  const rolling = draft === null && shown !== '';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Diminuisci ${label.toLowerCase()}`}
        className={button}
        disabled={value !== undefined && value <= min}
        onPointerDown={keepFocus}
        onClick={() => bump(-step)}
      >
        <Minus />
      </button>
      <label className={`flex ${box} min-w-0 flex-1 items-center`}>
        <span className="sr-only">{label}</span>
        <span className="flex w-full items-baseline gap-1.5">
          <span className="relative min-w-0 flex-1">
            <input
              inputMode={decimal ? 'decimal' : 'numeric'}
              enterKeyHint="done"
              className={`num w-full bg-transparent outline-none placeholder:text-fumo ${unit ? 'text-right' : 'text-center'} ${text} ${rolling ? 'text-transparent' : ''}`}
              value={draft ?? shown}
              placeholder={placeholder}
              onFocus={(e) => {
                setDraft(e.currentTarget.value);
                e.currentTarget.select();
              }}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (live) write(e.currentTarget.value);
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
            {rolling && (
              <span
                className={`num pointer-events-none absolute inset-0 flex items-center ${unit ? 'justify-end' : 'justify-center'} ${text}`}
              >
                <RollingNumber value={value} text={shown} />
              </span>
            )}
          </span>
          {unit && <span className="label-text w-7 shrink-0 text-fumo">{unit}</span>}
        </span>
      </label>
      <button
        type="button"
        aria-label={`Aumenta ${label.toLowerCase()}`}
        className={button}
        disabled={value !== undefined && value >= max}
        onPointerDown={keepFocus}
        onClick={() => bump(step)}
      >
        <Plus />
      </button>
    </div>
  );
}
