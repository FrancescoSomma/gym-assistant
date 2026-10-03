import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './App';
import { ProgramsScreen } from './features/programs/ProgramsScreen';
import { TodayScreen } from './features/today/TodayScreen';

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { index: true, Component: TodayScreen },
      { path: 'programs', Component: ProgramsScreen },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
