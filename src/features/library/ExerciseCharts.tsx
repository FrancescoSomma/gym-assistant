import { type ReactElement, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { formatNumber, formatSeconds, formatShortDate } from '../../domain/format';
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
  const first = points[0];
  const last = points[points.length - 1];

  // Yellow means record and nothing else; the latest point gets a chalk end-dot; others none.
  const renderDot = ({ cx, cy, index, payload }: DotProps): ReactElement => {
    const fill = payload?.record
      ? CHART.yellow
      : index === points.length - 1
        ? CHART.chalk
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

      {!first || !last || points.length < 2 ? (
        <p className="px-4 text-steel">
          Servono almeno due sessioni in questo periodo per disegnare l'andamento.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between px-4">
            <h3 className="text-small text-steel">{metric.title} per sessione</h3>
            <p className="num text-title">{metric.format(last.value)}</p>
          </div>
          <div
            className="h-56 pr-4"
            role="img"
            aria-label={`${metric.title} per sessione, da ${metric.format(first.value)} a ${metric.format(last.value)}. I valori sono nella tabella dei dati.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
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
                  cursor={{ stroke: CHART.steel, strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const p = pointOf(payload);
                    return active && p ? (
                      <TooltipBox
                        value={metric.format(p.value)}
                        label={`${formatShortDate(p.startedAt)}${p.record ? ', record' : ''}`}
                      />
                    ) : null;
                  }}
                />
                <Line
                  dataKey="value"
                  stroke={CHART.chalk}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={renderDot}
                  activeDot={{ r: 5, fill: CHART.chalk, stroke: CHART.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {tracking === 'weight_reps' && (
            <>
              <div className="flex items-baseline justify-between px-4 pt-6">
                <h3 className="text-small text-steel">Volume per sessione</h3>
                <p className="num text-title">{formatNumber(last.volume)} kg</p>
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
                      content={({ active, payload }) => {
                        const p = pointOf(payload);
                        return active && p ? (
                          <TooltipBox
                            value={`${formatNumber(p.volume)} kg`}
                            label={formatShortDate(p.startedAt)}
                          />
                        ) : null;
                      }}
                    />
                    <Bar
                      dataKey="volume"
                      fill={CHART.steel}
                      maxBarSize={24}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
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
          <table className="w-full border-t border-steel/25">
            <tbody>
              {records.map((r) => (
                <tr key={r.kind} className="border-b border-steel/25">
                  <th scope="row" className="py-3 pl-4 text-left font-normal">
                    {RECORD_LABELS[r.kind]}
                  </th>
                  <td className="num text-right text-title">{formatRecord(r.kind, r.value)}</td>
                  <td className="w-20 pr-4 text-right text-small text-steel">
                    {formatShortDate(r.startedAt)}
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
              <tr className="text-steel">
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
                <tr key={p.sessionId} className="border-b border-steel/25">
                  <td className="py-2 pl-4">{formatShortDate(p.startedAt)}</td>
                  <td className="text-right">{metric.format(p.value)}</td>
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
