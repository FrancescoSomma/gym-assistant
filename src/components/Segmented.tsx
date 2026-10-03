interface Props<T extends string> {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex gap-1 rounded-control bg-iron p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className="min-h-11 flex-1 rounded-[9px] leading-tight text-small font-semibold text-steel aria-pressed:bg-rubber aria-pressed:text-chalk"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
