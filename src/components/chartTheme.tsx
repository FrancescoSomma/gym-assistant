// Recharts takes color strings, not classes: these mirror the @theme tokens in src/styles/index.css.
export const CHART = {
  chalk: '#EDEBE6',
  steel: '#9C978E',
  yellow: '#F0C419', // records only
  surface: '#1F1E1C',
  grid: 'rgba(156, 151, 142, 0.25)',
  hover: 'rgba(156, 151, 142, 0.15)',
} as const;

/** Recessive axes: no lines, steel 13px ticks. */
export const AXIS = {
  tick: { fill: CHART.steel, fontSize: 13 },
  tickLine: false,
  axisLine: false,
} as const;

/** Values lead, labels follow: the number is the strong element. */
export function TooltipBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-control bg-iron px-3 py-2">
      <p className="num text-title">{value}</p>
      <p className="text-tiny text-steel">{label}</p>
    </div>
  );
}
