import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { listHistory } from '../../db/history';
import {
  countLabel,
  formatClock,
  formatDayParts,
  formatMonth,
  formatNumber,
} from '../../domain/format';

export function HistoryScreen() {
  const rows = useLiveQuery(listHistory);
  if (!rows) return null;
  const months = Map.groupBy(rows, (row) => formatMonth(row.session.startedAt));

  return (
    <>
      <Header large title="Storico" />
      {rows.length === 0 && (
        <p className="px-4 py-6 text-fumo">
          Nessun allenamento registrato. Inizia il primo dalla schermata Oggi.
        </p>
      )}
      {[...months].map(([month, list]) => (
        <section key={month}>
          <h2 className="sticky top-(--sticky-top) z-[1] flex items-baseline justify-between bg-(--surface) px-4 pt-5 pb-2">
            <span className="plate text-title first-letter:uppercase">{month}</span>
            <span className="text-small text-fumo">
              {countLabel(list.length, 'allenamento', 'allenamenti')}
            </span>
          </h2>
          <ul className="rule-t">
            {list.map(({ session, durationMs, sets, volume }) => {
              const { day, weekday } = formatDayParts(session.startedAt);
              return (
                <li key={session.id}>
                  <Link to={`/history/${session.id}`} className="row">
                    <span className="flex w-10 shrink-0 flex-col items-center">
                      <span className="num text-step">{day}</span>
                      <span className="label-text text-fumo">{weekday}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">Giornata {session.dayLabel}</span>
                      {session.dayName && (
                        <span className="block truncate text-small text-fumo">
                          {session.dayName}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-title">{formatClock(durationMs)}</span>
                      <span className="block text-small text-fumo tabular-nums">
                        {countLabel(sets, 'serie', 'serie')}
                        {volume > 0 && `, ${formatNumber(volume)} kg`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
