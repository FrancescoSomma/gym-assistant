import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, Dumbbell, History as HistoryIcon, TrendingUp } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getActiveSession } from './db/sessions';
import { ActiveWorkoutBar } from './features/workout/ActiveWorkoutBar';
import { StaleSessionSheet } from './features/workout/StaleSessionSheet';

const TABS = [
  { to: '/', label: 'Oggi', Icon: Dumbbell },
  { to: '/programs', label: 'Programmi', Icon: ClipboardList },
  { to: '/history', label: 'Storico', Icon: HistoryIcon },
  { to: '/progress', label: 'Progressi', Icon: TrendingUp },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null);
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <div className="sticky bottom-0 bg-rubber pb-[env(safe-area-inset-bottom)]">
        {/* Never reload during a workout: hidden while a session is open (and while loading). */}
        <UpdatePrompt hidden={active !== null} />
        {active && pathname !== '/' && <ActiveWorkoutBar session={active} />}
        <nav className="flex border-t border-steel/25">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-tiny ${isActive ? 'text-chalk' : 'text-steel'}`
              }
            >
              <Icon size={24} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <StaleSessionSheet session={active ?? null} />
    </div>
  );
}
