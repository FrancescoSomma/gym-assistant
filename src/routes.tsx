import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './App';
import { TodayScreen } from './features/today/TodayScreen';

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [{ index: true, Component: TodayScreen }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
