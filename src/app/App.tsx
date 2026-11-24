import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Layout } from './Layout';
import { TrainPage } from '../features/logger/TrainPage';
import { WorkoutPage } from '../features/logger/WorkoutPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { WorkoutDetailPage } from '../features/history/WorkoutDetailPage';
import { ExercisesPage } from '../features/exercises/ExercisesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { RoutinesPage } from '../features/routines/RoutinesPage';
import { RoutineEditorPage } from '../features/routines/RoutineEditorPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    // Abrir directamente /progress espera a cargar las gráficas: pantalla vacía (fondo oscuro) un instante.
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <TrainPage /> },
      { path: '/workout', element: <WorkoutPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/history/:id', element: <WorkoutDetailPage /> },
      // Las gráficas (Recharts) se cargan solo al abrir Progreso.
      { path: '/progress', lazy: async () => ({ Component: (await import('../features/progress/ProgressPage')).ProgressPage }) },
      { path: '/exercises', element: <ExercisesPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/routines', element: <RoutinesPage /> },
      { path: '/routines/:id', element: <RoutineEditorPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], { basename: import.meta.env.BASE_URL });

export function App() {
  return <RouterProvider router={router} />;
}
