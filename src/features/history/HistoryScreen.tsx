import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { listHistory } from '../../db/history';
import {
  countLabel,
  formatClock,
  formatDate,
  formatMonth,
  formatNumber,
} from '../../domain/format';

export function HistoryScreen() {
  const rows = useLiveQuery(listHistory);
  if (!rows) return null;
  const months = Map.groupBy(rows, (row) => formatMonth(row.session.startedAt));

  return (
    <>
      <Header title="Storico" />
      {rows.length === 0 && (
        <p className="px-4 py-6 text-steel">
          Nessun allenamento registrato. Inizia il primo dalla schermata Oggi.
        </p>
      )}
      {[...months].map(([month, list]) => (
        <section key={month}>
          <h2 className="section-title first-letter:uppercase">{month}</h2>
          <ul className="border-t border-steel/25">
            {list.map(({ session, durationMs, sets, volume }) => (
              <li key={session.id}>
                <Link to={`/history/${session.id}`} className="row">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      Giornata {session.dayLabel}
                      {session.dayName && `, ${session.dayName}`}
                    </span>
                    <span className="block text-small text-steel first-letter:uppercase">
                      {formatDate(session.startedAt)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-title">{formatClock(durationMs)}</span>
                    <span className="block text-small text-steel tabular-nums">
                      {countLabel(sets, 'serie', 'serie')}
                      {volume > 0 && `, ${formatNumber(volume)} kg`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
