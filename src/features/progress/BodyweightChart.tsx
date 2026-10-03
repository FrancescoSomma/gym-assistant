import type { ReactElement } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { dateKeyToTs } from '../../domain/dates';
import { formatNumber, formatShortDate, formatShortDateYear } from '../../domain/format';
import type { Bodyweight } from '../../types';

interface Point {
  ts: number;
  kg: number;
}

export default function BodyweightChart({ entries }: { entries: Bodyweight[] }) {
  const points: Point[] = [...entries]
    .reverse()
    .map((e) => ({ ts: dateKeyToTs(e.date), kg: e.kg }));
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;
  const renderDot = ({
    cx,
    cy,
    index,
  }: {
    cx?: number;
    cy?: number;
    index?: number;
  }): ReactElement =>
    index === points.length - 1 && cx !== undefined && cy !== undefined ? (
      <circle
        key="end"
        cx={cx}
        cy={cy}
        r={5}
        fill={CHART.chalk}
        stroke={CHART.surface}
        strokeWidth={2}
      />
    ) : (
      <g key={`dot-${index}`} />
    );

  return (
    <section className="pt-4">
      <div className="flex items-baseline justify-between px-4">
        <h2 className="text-small text-steel">Andamento</h2>
        <p className="num text-title">{formatNumber(last.kg)} kg</p>
      </div>
      <div
        className="h-48 pr-4"
        role="img"
        aria-label={`Peso corporeo da ${formatNumber(first.kg)} a ${formatNumber(last.kg)} kg. I valori sono nell'elenco delle misurazioni.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatShortDate}
              minTickGap={32}
              {...AXIS}
            />
            <YAxis
              width={40}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => formatNumber(v)}
              {...AXIS}
            />
            <Tooltip
              cursor={{ stroke: CHART.steel, strokeWidth: 1 }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const p = (payload?.[0] as { payload?: Point } | undefined)?.payload;
                return active && p ? (
                  <TooltipBox
                    value={`${formatNumber(p.kg)} kg`}
                    label={formatShortDateYear(p.ts)}
                  />
                ) : null;
              }}
            />
            <Line
              dataKey="kg"
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
    </section>
  );
}
