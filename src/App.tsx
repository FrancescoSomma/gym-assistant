import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, Dumbbell, History as HistoryIcon, TrendingUp } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getActiveSession } from './db/sessions';
import { getSettings } from './db/settings';
import { type EnterMotion, enterMotion } from './domain/navigation';
import { ActiveWorkoutBar } from './features/workout/ActiveWorkoutBar';
import { StaleSessionSheet } from './features/workout/StaleSessionSheet';

const TABS = [
  { to: '/', label: 'Oggi', Icon: Dumbbell },
  { to: '/programs', label: 'Programmi', Icon: ClipboardList },
  { to: '/history', label: 'Storico', Icon: HistoryIcon },
  { to: '/progress', label: 'Progressi', Icon: TrendingUp },
];

const ENTER: Record<EnterMotion, string> = {
  none: '',
  fade: 'animate-enter-fade',
  forward: 'animate-enter-forward',
  back: 'animate-enter-back',
};

export function AppLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null);
  const settings = useLiveQuery(getSettings);
  const motion = enterMotion({
    pathname: location.pathname,
    navigationType,
    back: (location.state as { dir?: string } | null)?.dir === 'back',
    initial: location.key === 'default', // React Router: always "default" on the first location
  });

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <main className="flex flex-1 flex-col">
        {/* Keyed by path: each screen plays its entrance once, query changes (tabs) do not. */}
        <div key={location.pathname} className={`flex flex-1 flex-col ${ENTER[motion]}`}>
          <Outlet />
        </div>
      </main>
      <div className="sticky bottom-0 z-10 bg-arena pb-[env(safe-area-inset-bottom)]">
        {/* Never reload during a workout: hidden while a session is open (and while loading). */}
        <UpdatePrompt hidden={active !== null} />
        {active && location.pathname !== '/' && (
          <ActiveWorkoutBar session={active} timer={settings?.activeTimer ?? null} />
        )}
        <nav aria-label="Sezioni" className="flex rule-t">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 label-text ${isActive ? 'text-luce' : 'text-fumo active:text-luce'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 h-[3px] w-6 -skew-x-12 bg-pedana"
                    />
                  )}
                  <Icon size={24} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <StaleSessionSheet session={active ?? null} />
    </div>
  );
}
