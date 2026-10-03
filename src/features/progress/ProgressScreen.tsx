import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Header } from '../../components/Header';
import { Segmented } from '../../components/Segmented';
import { listTrainedExercises } from '../../db/history';
import { relativeDay } from '../../domain/format';
import { formatRecord, headlineRecord, RECORD_LABELS } from '../../domain/records';

const ConsistencyView = lazy(() => import('./ConsistencyView'));
const GroupsView = lazy(() => import('./GroupsView'));

type Tab = 'exercises' | 'groups' | 'consistency';

const TABS: [Tab, string][] = [
  ['exercises', 'Esercizi'],
  ['groups', 'Gruppi muscolari'],
  ['consistency', 'Costanza'],
];

export function ProgressScreen() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find(([key]) => key === params.get('tab'))?.[0] ?? 'exercises';
  return (
    <>
      <Header title="Progressi" />
      <div className="px-4 pb-2">
        <Segmented<Tab>
          options={TABS}
          value={tab}
          onChange={(next) =>
            setParams(next === 'exercises' ? {} : { tab: next }, { replace: true })
          }
        />
      </div>
      <Suspense fallback={null}>
        {tab === 'exercises' && <ExerciseProgress />}
        {tab === 'groups' && <GroupsView />}
        {tab === 'consistency' && <ConsistencyView />}
      </Suspense>
    </>
  );
}

function ExerciseProgress() {
  const rows = useLiveQuery(listTrainedExercises);
  if (!rows) return null;
  return (
    <>
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
                <Link
                  to={`/exercises/${exercise.id}`}
                  state={{ back: '/progress' }}
                  className="row"
                >
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
