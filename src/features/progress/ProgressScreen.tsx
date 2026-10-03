import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { listTrainedExercises } from '../../db/history';
import { relativeDay } from '../../domain/format';
import { formatRecord, headlineRecord, RECORD_LABELS } from '../../domain/records';

export function ProgressScreen() {
  const rows = useLiveQuery(listTrainedExercises);
  if (!rows) return null;
  return (
    <>
      <Header title="Progressi" />
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-steel">
          Nessun progresso da mostrare. Completa un allenamento e torna qui.
        </p>
      ) : (
        <ul className="border-t border-steel/25">
          {rows.map(({ exercise, lastAt, best }) => {
            const headline = headlineRecord(best, exercise.trackingType);
            return (
              <li key={exercise.id}>
                <Link to={`/exercises/${exercise.id}`} className="row">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{exercise.name}</span>
                    <span className="block text-small text-steel">
                      Ultima volta {relativeDay(lastAt)}
                    </span>
                  </span>
                  {headline && (
                    <span className="text-right">
                      <span className="num block text-title">
                        {formatRecord(headline.kind, headline.value)}
                      </span>
                      <span className="block text-tiny text-steel">
                        {RECORD_LABELS[headline.kind]}
                      </span>
                    </span>
                  )}
                  <ChevronRight size={20} className="shrink-0 text-steel" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
