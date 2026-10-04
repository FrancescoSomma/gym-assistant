import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { listGroupEntries } from '../../db/history';
import { lastWeekStarts } from '../../domain/dates';
import { formatNumber, formatShortDate, formatShortDateYear } from '../../domain/format';
import { GROUP_BAND, inGroupBand, weeklySetsByGroup } from '../../domain/groups';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../types';

const GROUPS = Object.entries(MUSCLE_GROUPS) as [MuscleGroup, string][];

export default function GroupsView() {
  const now = Date.now();
  const since = lastWeekStarts(now, 12)[0] ?? 0;
  const entries = useLiveQuery(() => listGroupEntries(since), [since]);
  const [group, setGroup] = useState<MuscleGroup>('chest');
  if (!entries) return null;

  const weeks = weeklySetsByGroup(entries, now);
  const thisWeek = weeks[weeks.length - 1]?.totals;
  const rows = GROUPS.map(([key, label]) => ({ key, label, sets: thisWeek?.[key] ?? 0 }));
  const trend = weeks.map((w, i) => ({
    weekStart: w.weekStart,
    sets: w.totals[group],
    current: i === weeks.length - 1,
  }));
  const top = Math.max(GROUP_BAND.max + 4, ...rows.map((r) => r.sets), ...trend.map((t) => t.sets));
  const ticks = [0, GROUP_BAND.min, GROUP_BAND.max];

  return (
    <>
      <section>
        <h2 className="section-title">Serie di questa settimana</h2>
        <p className="px-4 pb-2 text-small text-fumo">
          La fascia da {GROUP_BAND.min} a {GROUP_BAND.max} serie è un riferimento indicativo: le
          barre chiare ci stanno dentro. I gruppi secondari contano mezza serie.
        </p>
        <div
          className="h-72 pr-2"
          role="img"
          aria-label={`Serie di questa settimana: ${rows.map((r) => `${r.label} ${formatNumber(r.sets)}`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 4, right: 32, bottom: 0, left: 0 }}
            >
              <ReferenceArea
                x1={GROUP_BAND.min}
                x2={GROUP_BAND.max}
                fill={CHART.band}
                stroke="none"
              />
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" domain={[0, top]} ticks={ticks} {...AXIS} />
              <YAxis type="category" dataKey="label" width={84} {...AXIS} />
              <Bar dataKey="sets" maxBarSize={24} radius={[0, 2, 2, 0]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.key} fill={inGroupBand(r.sets) ? CHART.luce : CHART.fumo} />
                ))}
                <LabelList
                  dataKey="sets"
                  position="right"
                  fill={CHART.luce}
                  fontSize={13}
                  formatter={(value) => formatNumber(Number(value))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="section-title">Ultime 12 settimane</h2>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          {GROUPS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={group === key}
              onClick={() => setGroup(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="h-48 pr-4"
          role="img"
          aria-label={`Serie per settimana di ${MUSCLE_GROUPS[group]}. I valori sono nella tabella dei dati.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <ReferenceArea
                y1={GROUP_BAND.min}
                y2={GROUP_BAND.max}
                fill={CHART.band}
                stroke="none"
              />
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis
                dataKey="weekStart"
                tickFormatter={formatShortDate}
                minTickGap={24}
                {...AXIS}
              />
              <YAxis width={32} domain={[0, top]} ticks={ticks} {...AXIS} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: CHART.hover }}
                content={({ active, payload }) => {
                  const p = (payload?.[0] as { payload?: (typeof trend)[number] } | undefined)
                    ?.payload;
                  return active && p ? (
                    <TooltipBox
                      value={`${formatNumber(p.sets)} serie`}
                      label={`Settimana del ${formatShortDateYear(p.weekStart)}`}
                    />
                  ) : null;
                }}
              />
              <Bar dataKey="sets" maxBarSize={24} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {trend.map((t) => (
                  <Cell key={t.weekStart} fill={t.current ? CHART.luce : CHART.fumo} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="pt-2">
          <summary className="section-title min-h-11 cursor-pointer">Mostra i dati</summary>
          <table className="w-full text-small tabular-nums">
            <thead>
              <tr className="text-fumo">
                <th scope="col" className="pl-4 text-left font-normal">
                  Settimana del
                </th>
                <th scope="col" className="pr-4 text-right font-normal">
                  Serie di {MUSCLE_GROUPS[group].toLowerCase()}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...trend].reverse().map((t) => (
                <tr key={t.weekStart} className="rule-b">
                  <td className="py-2 pl-4">{formatShortDateYear(t.weekStart)}</td>
                  <td className="pr-4 text-right">{formatNumber(t.sets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </>
  );
}
