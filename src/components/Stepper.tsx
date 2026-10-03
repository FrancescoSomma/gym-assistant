import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatNumber, parseInteger, parseWeight } from '../domain/format';

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
  /** lg: 56pt targets for workout mode. */
  size?: 'md' | 'lg';
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
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const bump = (delta: number) => onChange(value === undefined ? fallback : clamp(value + delta));
  const commit = () => {
    if (draft === null) return;
    const text = draft.trim();
    const parsed = decimal ? parseWeight(text) : parseInteger(text);
    if (text === '') onChange(undefined);
    else if (parsed !== undefined) onChange(clamp(parsed));
    setDraft(null); // invalid text: back to the stored value
  };

  const height = size === 'lg' ? 'h-14' : 'h-11';
  const button = `flex ${height} w-14 shrink-0 items-center justify-center rounded-control bg-steel/15 active:opacity-60 disabled:opacity-30`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Diminuisci ${label.toLowerCase()}`}
        className={button}
        disabled={value !== undefined && value <= min}
        onClick={() => bump(-step)}
      >
        <Minus />
      </button>
      <label className={`flex ${height} min-w-0 flex-1 items-center`}>
        <span className="sr-only">{label}</span>
        <span className="flex w-full items-baseline gap-1">
          <input
            inputMode={decimal ? 'decimal' : 'numeric'}
            enterKeyHint="done"
            className={`num min-w-0 flex-1 bg-transparent outline-none placeholder:text-steel ${unit ? 'text-right' : 'text-center'} ${size === 'lg' ? 'text-value' : 'text-title'}`}
            value={draft ?? (value === undefined ? '' : formatNumber(value))}
            placeholder={placeholder}
            onFocus={(e) => {
              setDraft(e.currentTarget.value);
              e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
          {unit && <span className="flex-1 text-small text-steel">{unit}</span>}
        </span>
      </label>
      <button
        type="button"
        aria-label={`Aumenta ${label.toLowerCase()}`}
        className={button}
        disabled={value !== undefined && value >= max}
        onClick={() => bump(step)}
      >
        <Plus />
      </button>
    </div>
  );
}
