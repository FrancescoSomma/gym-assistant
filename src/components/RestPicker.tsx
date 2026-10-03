import { useState } from 'react';
import { Stepper } from './Stepper';

const PRESETS = [60, 90, 120, 180];

/** SPEC §5.2: 60, 90, 120, 180 s or a custom value. */
export function RestPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (sec: number) => void;
}) {
  const [custom, setCustom] = useState(!PRESETS.includes(value));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((sec) => (
          <button
            key={sec}
            type="button"
            className="chip"
            aria-pressed={!custom && value === sec}
            onClick={() => {
              // Save a half-typed custom value now, so the preset is the last write and wins.
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
              setCustom(false);
              onChange(sec);
            }}
          >
            {sec} s
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={custom}
          onClick={() => setCustom(true)}
        >
          Altro
        </button>
      </div>
      {custom && (
        <Stepper
          label="Recupero"
          value={value}
          step={15}
          min={15}
          max={600}
          unit="s"
          onChange={(sec) => {
            if (sec !== undefined) onChange(sec);
          }}
        />
      )}
    </div>
  );
}
