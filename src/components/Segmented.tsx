interface Props<T extends string> {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
  /** 56pt buttons, for use during a workout. */
  tall?: boolean;
}

export function Segmented<T extends string>({ options, value, onChange, tall = false }: Props<T>) {
  return (
    <div className="flex gap-1 rounded-control bg-tribuna p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className={`${tall ? 'min-h-14' : 'min-h-11'} flex-1 rounded-tag px-2 text-small leading-tight font-semibold text-fumo active:text-luce aria-pressed:bg-luce aria-pressed:text-arena`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
