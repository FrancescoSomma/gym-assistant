interface Props {
  /** Number of lights. */
  total: number;
  /** How many are on, from the left. */
  lit: number;
  /** Warmups light up grey: they do not count. */
  muted?: boolean;
  /** Light up one after the other, as on a set confirmed a moment ago. */
  sequence?: boolean;
  /** Accessible name; without it the lights are decorative. */
  label?: string;
  /** Use luce instead of green and fumo, for lights on a blue row. */
  tone?: 'luce';
}

/** The judges' lights: green once done (green means completed), outlined while to do. */
export function Lights({ total, lit, muted = false, sequence = false, label, tone }: Props) {
  const on = tone === 'luce' ? 'bg-luce' : muted ? 'bg-fumo' : 'bg-plate-green';
  const off = tone === 'luce' ? 'border-luce/70' : 'border-fumo/70';
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is "img" exactly when label is set, which supports aria-label
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="flex shrink-0 items-center gap-1"
    >
      {Array.from({ length: total }, (_, i) => i).map((n) => (
        <span
          key={n}
          className={`size-2.5 rounded-full ${n < lit ? `${on} ${sequence ? 'animate-light-on' : ''}` : `border-[1.5px] ${off}`}`}
          style={sequence && n < lit ? { animationDelay: `${n * 70}ms` } : undefined}
        />
      ))}
    </span>
  );
}
