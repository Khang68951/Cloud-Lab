import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import NotFoundPage from '@/pages/NotFoundPage';
import RouteError from '@/pages/RouteError';
import { AppShell } from './layout/AppShell';

/**
 * Pages are lazy-loaded so heavy features (Lab canvas, MDX lessons) only
 * download when visited. Routes with `handle.fullBleed` use the whole
 * viewport (no page padding) — used by the Lab.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export interface RouteHandle {
  fullBleed?: boolean;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: page(() => import('@/pages/HomePage')) },
          { path: 'roadmap', lazy: page(() => import('@/pages/RoadmapPage')) },
          { path: 'learn', lazy: page(() => import('@/pages/TracksPage')) },
          { path: 'learn/:trackSlug', lazy: page(() => import('@/pages/TrackPage')) },
          { path: 'learn/:trackSlug/certificate', lazy: page(() => import('@/pages/CertificatePage')) },
          { path: 'glossary', lazy: page(() => import('@/pages/GlossaryPage')) },
          { path: 'learn/:trackSlug/:moduleSlug/:lessonSlug', lazy: page(() => import('@/pages/LessonPage')) },
          { path: 'practice', lazy: page(() => import('@/pages/PracticePage')) },
          { path: 'lab', lazy: page(() => import('@/pages/LabPage')), handle: { fullBleed: true } satisfies RouteHandle },
          {
            path: 'lab/challenge/:exerciseId',
            lazy: page(() => import('@/pages/ChallengePage')),
            handle: { fullBleed: true } satisfies RouteHandle,
          },
          { path: 'simulator', element: <Navigate to="/lab" replace /> },
          { path: 'explore', lazy: page(() => import('@/pages/ExplorePage')) },
          { path: 'settings', lazy: page(() => import('@/pages/SettingsPage')) },

          // Features planned for later phases redirect home for now.
          { path: 'labs', element: <Navigate to="/" replace /> },
          { path: 'review', element: <Navigate to="/" replace /> },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
