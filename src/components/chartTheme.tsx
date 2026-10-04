import { Tab } from './Tab';

// Recharts takes colour strings, not classes: these mirror the @theme tokens in src/styles/index.css.
export const CHART = {
  luce: '#F2F1EC',
  fumo: '#8F949B',
  pedana: '#B8875A', // reference bands and goal lines
  yellow: '#F6D43A', // records only
  surface: '#0B0C0E',
  grid: 'rgba(242, 241, 236, 0.14)',
  hover: 'rgba(242, 241, 236, 0.08)',
  band: 'rgba(184, 135, 90, 0.18)',
} as const;

/** Recessive axes: no lines, fumo 13px ticks with tabular figures. */
export const AXIS = {
  tick: {
    fill: CHART.fumo,
    fontSize: 13,
    fontFamily: 'Archivo, system-ui, sans-serif',
    style: { fontVariantNumeric: 'tabular-nums' },
  },
  tickLine: false,
  axisLine: false,
} as const;

/** A small lower third: the label on the wood tab, the value on the scoreboard. */
export function TooltipBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-tribuna">
      <Tab className="py-0.5 label-text">{label}</Tab>
      <p className="num px-3 py-1.5 text-title">{value}</p>
    </div>
  );
}
