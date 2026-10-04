import { type ReactElement, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { Segmented } from '../../components/Segmented';
import type { ExerciseSession } from '../../db/exercises';
import {
  formatNumber,
  formatSeconds,
  formatShortDate,
  formatShortDateYear,
} from '../../domain/format';
import { exerciseSeries, type Period, periodStart, type SeriesPoint } from '../../domain/progress';
import { formatRecord, RECORD_LABELS, recordTable } from '../../domain/records';
import type { TrackingType } from '../../types';

const PERIODS: [Period, string][] = [
  ['3m', '3 mesi'],
  ['6m', '6 mesi'],
  ['1y', '1 anno'],
  ['all', 'Tutto'],
];

const METRIC: Record<TrackingType, { title: string; format: (value: number) => string }> = {
  weight_reps: {
    title: 'Massimale stimato',
    format: (v) => `${formatNumber(Math.round(v * 10) / 10)} kg`,
  },
  bodyweight_reps: { title: 'Ripetizioni migliori', format: (v) => `${v} rip` },
  duration: { title: 'Durata migliore', format: (v) => formatSeconds(v) },
};

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: SeriesPoint;
}

const pointOf = (payload: unknown): SeriesPoint | undefined =>
  (payload as { payload?: SeriesPoint }[] | undefined)?.[0]?.payload;

type ValuedPoint = SeriesPoint & { value: number };
const hasValue = (p: SeriesPoint): p is ValuedPoint => p.value !== undefined;

const TOO_FEW = "Servono almeno due sessioni in questo periodo per disegnare l'andamento.";

export default function ExerciseCharts({
  history,
  tracking,
}: {
  history: ExerciseSession[];
  tracking: TrackingType;
}) {
  const [period, setPeriod] = useState<Period>('6m');
  const from = periodStart(period, Date.now());
  const points = exerciseSeries(history, tracking).filter((p) => p.startedAt >= from);
  const records = recordTable(history, tracking);
  const metric = METRIC[tracking];
  // The line skips sessions without a value (only sets above 12 reps); the bars keep them all.
  const valued = points.filter(hasValue);
  const first = valued[0];
  const last = valued[valued.length - 1];
  const lastVolume = points[points.length - 1]?.volume ?? 0;

  // Yellow means record and nothing else; the latest point gets a light end-dot; others none.
  const renderDot = ({ cx, cy, index, payload }: DotProps): ReactElement => {
    const fill = payload?.record
      ? CHART.yellow
      : index === valued.length - 1
        ? CHART.luce
        : undefined;
    if (cx === undefined || cy === undefined || !fill) return <g key={`dot-${index}`} />;
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={5}
        fill={fill}
        stroke={CHART.surface}
        strokeWidth={2}
      />
    );
  };

  return (
    <section className="pb-2">
      <h2 className="section-title">Andamento</h2>
      <div className="px-4 pb-3">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {points.length < 2 ? (
        <p className="px-4 text-fumo">{TOO_FEW}</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between px-4">
            <h3 className="text-small text-fumo">{metric.title} per sessione</h3>
            {last && (
              <p className={`num text-title ${last.record ? 'text-plate-yellow' : ''}`}>
                {metric.format(last.value)}
              </p>
            )}
          </div>
          {!first || !last || valued.length < 2 ? (
            <p className="px-4 pt-1 text-small text-fumo">
              {tracking === 'weight_reps'
                ? 'Il massimale stimato si calcola su serie fino a 12 ripetizioni.'
                : TOO_FEW}
            </p>
          ) : (
            <div
              className="h-56 pr-4"
              role="img"
              aria-label={`${metric.title} per sessione, da ${metric.format(first.value)} a ${metric.format(last.value)}. I valori sono nella tabella dei dati.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={valued} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis
                    dataKey="startedAt"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={formatShortDate}
                    minTickGap={32}
                    {...AXIS}
                  />
                  <YAxis
                    width={44}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => formatNumber(v)}
                    {...AXIS}
                  />
                  <Tooltip
                    cursor={{ stroke: CHART.fumo, strokeWidth: 1 }}
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      const p = pointOf(payload);
                      return active && p?.value !== undefined ? (
                        <TooltipBox
                          value={metric.format(p.value)}
                          label={`${formatShortDateYear(p.startedAt)}${p.record ? ', record' : ''}`}
                        />
                      ) : null;
                    }}
                  />
                  <Line
                    dataKey="value"
                    stroke={CHART.luce}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={renderDot}
                    activeDot={{ r: 5, fill: CHART.luce, stroke: CHART.surface, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {tracking === 'weight_reps' && (
            <>
              <div className="flex items-baseline justify-between px-4 pt-6">
                <h3 className="text-small text-fumo">Volume per sessione</h3>
                <p className="num text-title">{formatNumber(lastVolume)} kg</p>
              </div>
              <div
                className="h-44 pr-4"
                role="img"
                aria-label="Volume per sessione. I valori sono nella tabella dei dati."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis
                      dataKey="startedAt"
                      tickFormatter={formatShortDate}
                      minTickGap={32}
                      {...AXIS}
                    />
                    <YAxis width={44} tickFormatter={(v: number) => formatNumber(v)} {...AXIS} />
                    <Tooltip
                      cursor={{ fill: CHART.hover }}
                      isAnimationActive={false}
                      content={({ active, payload }) => {
                        const p = pointOf(payload);
                        return active && p ? (
                          <TooltipBox
                            value={`${formatNumber(p.volume)} kg`}
                            label={formatShortDateYear(p.startedAt)}
                          />
                        ) : null;
                      }}
                    />
                    <Bar
                      dataKey="volume"
                      maxBarSize={24}
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    >
                      {points.map((p, i) => (
                        <Cell
                          key={p.sessionId}
                          fill={i === points.length - 1 ? CHART.luce : CHART.fumo}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}

      {records.length > 0 && (
        <>
          <h3 className="section-title">Record</h3>
          <table className="w-full border-t border-luce">
            <tbody>
              {records.map((r) => (
                <tr key={r.kind} className="rule-b">
                  <th scope="row" className="py-3 pl-4 text-left font-normal">
                    {RECORD_LABELS[r.kind]}
                  </th>
                  <td className="num text-right text-title text-plate-yellow">
                    {formatRecord(r.kind, r.value)}
                  </td>
                  <td className="w-20 pr-4 pl-3 text-right text-small whitespace-nowrap text-fumo">
                    {formatShortDateYear(r.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {points.length > 0 && (
        <details className="pt-2">
          <summary className="section-title min-h-11 cursor-pointer">Mostra i dati</summary>
          <table className="w-full text-small tabular-nums">
            <thead>
              <tr className="text-fumo">
                <th scope="col" className="pl-4 text-left font-normal">
                  Data
                </th>
                <th scope="col" className="text-right font-normal">
                  {metric.title}
                </th>
                {tracking === 'weight_reps' && (
                  <th scope="col" className="pr-4 text-right font-normal">
                    Volume
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.sessionId} className="rule-b">
                  <td className="py-2 pl-4 whitespace-nowrap">
                    {formatShortDateYear(p.startedAt)}
                  </td>
                  <td className="text-right">
                    {p.value === undefined ? '–' : metric.format(p.value)}
                  </td>
                  {tracking === 'weight_reps' && (
                    <td className="pr-4 text-right">{formatNumber(p.volume)} kg</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
