import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell, History, ListChecks, Settings, ChevronRight } from 'lucide-react';
import { getActiveWorkout } from '../db/workouts';
import type { Workout } from '../db/types';
import { RestTimerBar, RestTimerEngine } from '../features/logger/RestTimer';
import { useNow } from '../hooks/useNow';
import { fmtDuration } from '../lib/format';

const NAV = [
  { to: '/', label: 'Entrenar', icon: Dumbbell },
  { to: '/history', label: 'Historial', icon: History },
  { to: '/exercises', label: 'Ejercicios', icon: ListChecks },
  { to: '/settings', label: 'Ajustes', icon: Settings },
];

export function Layout() {
  const { pathname } = useLocation();
  const inWorkout = pathname === '/workout';
  const active = useLiveQuery(async () => (await getActiveWorkout()) ?? null, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 pb-48">
        <Outlet />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg">
        {active && !inWorkout && <ActiveWorkoutPill workout={active} />}
        <RestTimerBar />
        {!inWorkout && (
          <nav className="grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                <Icon size={22} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {/* APK edge-to-edge: franja opaca bajo la barra de estado (0 px en navegador). */}
      <div className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-bg" />
      <RestTimerEngine />
    </div>
  );
}

function ActiveWorkoutPill({ workout }: { workout: Workout }) {
  const now = useNow(1000);
  return (
    <Link
      to="/workout"
      className="mx-3 mb-2 flex h-14 items-center justify-between rounded-2xl bg-accent px-4 font-semibold text-accent-fg shadow-lg"
    >
      <span className="truncate">
        En curso · <span className="tabular-nums">{fmtDuration(now - workout.startedAt)}</span>
      </span>
      <span className="flex items-center">
        Continuar <ChevronRight size={20} />
      </span>
    </Link>
  );
}
