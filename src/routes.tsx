import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './App';
import { HistoryScreen } from './features/history/HistoryScreen';
import { SessionDetail } from './features/history/SessionDetail';
import { ExerciseDetail } from './features/library/ExerciseDetail';
import { DayEditor } from './features/programs/DayEditor';
import { ProgramEditor } from './features/programs/ProgramEditor';
import { ProgramsScreen } from './features/programs/ProgramsScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { TodayScreen } from './features/today/TodayScreen';
import { SummaryScreen } from './features/workout/SummaryScreen';
import { WorkoutScreen } from './features/workout/WorkoutScreen';

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { index: true, Component: TodayScreen },
      { path: 'programs', Component: ProgramsScreen },
      { path: 'programs/:programId', Component: ProgramEditor },
      { path: 'programs/:programId/days/:dayId', Component: DayEditor },
      { path: 'history', Component: HistoryScreen },
      { path: 'history/:sessionId', Component: SessionDetail },
      { path: 'progress', Component: ProgressScreen },
      { path: 'exercises/:exerciseId', Component: ExerciseDetail },
      { path: 'settings', Component: SettingsScreen },
    ],
  },
  { path: 'workout/:sessionId/summary', Component: SummaryScreen },
  { path: 'workout/:sessionId', Component: WorkoutScreen },
  { path: '*', element: <Navigate to="/" replace /> },
]);
