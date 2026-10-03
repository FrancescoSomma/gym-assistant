import { ClipboardList, Dumbbell } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { UpdatePrompt } from './components/UpdatePrompt';

const TABS = [
  { to: '/', label: 'Oggi', Icon: Dumbbell },
  { to: '/programs', label: 'Programmi', Icon: ClipboardList },
];

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <div className="sticky bottom-0 bg-rubber pb-[env(safe-area-inset-bottom)]">
        <UpdatePrompt />
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
    </div>
  );
}
