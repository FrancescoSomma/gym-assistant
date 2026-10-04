import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { listCompletedSessions } from '../../db/history';
import { getSettings } from '../../db/settings';
import {
  countInMonth,
  lastWeekStarts,
  monthCells,
  toDateKey,
  weeklyCounts,
} from '../../domain/dates';
import { countLabel, formatMonth, formatShortDate, formatShortDateYear } from '../../domain/format';

const WEEKDAYS = [
  ['lun', 'L'],
  ['mar', 'M'],
  ['mer', 'M'],
  ['gio', 'G'],
  ['ven', 'V'],
  ['sab', 'S'],
  ['dom', 'D'],
] as const;

export default function ConsistencyView() {
  const now = Date.now();
  const [shown, setShown] = useState(() => ({
    year: new Date(now).getFullYear(),
    month: new Date(now).getMonth(),
  }));
  const monthStart = new Date(shown.year, shown.month, 1).getTime();
  const since = Math.min(monthStart, lastWeekStarts(now, 12)[0] ?? monthStart);
  const sessions = useLiveQuery(() => listCompletedSessions(since), [since]);
  const settings = useLiveQuery(getSettings);
  if (!sessions || !settings) return null;

  const goal = settings.weeklyGoal;
  const trained = new Set(sessions.map((s) => toDateKey(s.startedAt)));
  const today = toDateKey(now);
  const isCurrentMonth =
    shown.year === new Date(now).getFullYear() && shown.month === new Date(now).getMonth();
  const startedAts = sessions.map((s) => s.startedAt);
  const weeks = weeklyCounts(startedAts, now);
  // One unit of headroom keeps the goal label above the line inside the chart.
  const yMax = Math.max(goal, ...weeks.map((w) => w.count)) + 1;
  const shift = (delta: number) =>
    setShown(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <>
      <section className="px-4">
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            aria-label="Mese precedente"
            className="flex size-11 items-center justify-center text-fumo"
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </button>
          <h2 className="plate text-title first-letter:uppercase">{formatMonth(monthStart)}</h2>
          <button
            type="button"
            aria-label="Mese successivo"
            disabled={isCurrentMonth}
            className="flex size-11 items-center justify-center text-fumo disabled:opacity-30"
            onClick={() => shift(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <ol className="grid grid-cols-7 text-center label-text text-fumo" aria-hidden="true">
          {WEEKDAYS.map(([key, short]) => (
            <li key={key} className="py-1">
              {short}
            </li>
          ))}
        </ol>
        <ol className="grid grid-cols-7">
          {monthCells(shown.year, shown.month).map((cell) => {
            if (!cell.day) return <li key={cell.key} />;
            const dateKey = toDateKey(new Date(shown.year, shown.month, cell.day).getTime());
            const done = trained.has(dateKey);
            return (
              <li key={cell.key} className="flex h-11 items-center justify-center">
                <span
                  role="img"
                  aria-label={`${cell.day}${done ? ', allenamento' : ''}${dateKey === today ? ', oggi' : ''}`}
                  className={`num flex size-9 items-center justify-center rounded-full text-body ${done ? 'bg-luce text-arena' : 'text-fumo'} ${dateKey === today ? 'ring-[1.5px] ring-pedana' : ''}`}
                >
                  {cell.day}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="pt-2 text-small text-fumo">
          {countLabel(
            countInMonth(startedAts, shown.year, shown.month),
            'allenamento',
            'allenamenti',
          )}{' '}
          nel mese. I giorni pieni sono quelli in cui ti sei allenato.
        </p>
      </section>

      <section>
        <h2 className="section-title">Allenamenti per settimana</h2>
        <p className="px-4 pb-2 text-small text-fumo">
          In chiaro le settimane in cui hai raggiunto l'obiettivo di {goal}.
        </p>
        <div
          className="h-44 pr-4"
          role="img"
          aria-label="Allenamenti per settimana rispetto all'obiettivo. I valori sono nella tabella dei dati."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis
                dataKey="weekStart"
                tickFormatter={formatShortDate}
                minTickGap={24}
                {...AXIS}
              />
              <YAxis
                width={24}
                allowDecimals={false}
                domain={[0, yMax]}
                tickCount={yMax + 1} // one tick per unit, else [0, 5] gives 0, 2, 4, 5
                {...AXIS}
              />
              <ReferenceLine
                y={goal}
                stroke={CHART.pedana}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: `Obiettivo ${goal}`,
                  position: 'insideBottomRight', // above the line: the current week's bar ends at it
                  fill: CHART.pedana,
                  fontSize: 13,
                }}
              />
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: CHART.hover }}
                content={({ active, payload }) => {
                  const p = (payload?.[0] as { payload?: (typeof weeks)[number] } | undefined)
                    ?.payload;
                  return active && p ? (
                    <TooltipBox
                      value={countLabel(p.count, 'allenamento', 'allenamenti')}
                      label={`Settimana del ${formatShortDateYear(p.weekStart)}`}
                    />
                  ) : null;
                }}
              />
              <Bar dataKey="count" maxBarSize={24} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {weeks.map((w) => (
                  <Cell key={w.weekStart} fill={w.count >= goal ? CHART.luce : CHART.fumo} />
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
                  Allenamenti
                </th>
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => (
                <tr key={w.weekStart} className="rule-b">
                  <td className="py-2 pl-4">{formatShortDateYear(w.weekStart)}</td>
                  <td className="pr-4 text-right">
                    {w.count} di {goal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </>
  );
}
