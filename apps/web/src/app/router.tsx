import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { DOMAINS } from '@/domains';
import type { PageLoader } from '@/domains/types';
import type { DomainHandle } from '@/domains/useDomain';
import NotFoundPage from '@/pages/NotFoundPage';
import RouteError from '@/pages/RouteError';
import { AppShell } from './layout/AppShell';
import { ToCloud } from './LegacyRedirect';

/**
 * URL layout:
 *   /                      Learning Lab hub (pick a domain)
 *   /settings              app settings
 *   /<domain>              domain home, e.g. /cloud
 *   /<domain>/learn/...    shared course pages (every domain has them)
 *   /<domain>/<tool>       the domain's own pages, e.g. /cloud/lab
 *
 * Pages are lazy-loaded so heavy features (Lab canvas, MDX lessons) only
 * download when visited. Routes with `handle.fullBleed` use the whole
 * viewport (no page padding) — used by the Lab.
 */
const page = (load: PageLoader) => async () => ({ Component: (await load()).default });

/** Pages every domain gets for its courses. */
const coursePages = (): RouteObject[] => [
  { path: 'roadmap', lazy: page(() => import('@/pages/RoadmapPage')) },
  { path: 'learn', lazy: page(() => import('@/pages/TracksPage')) },
  { path: 'learn/:trackSlug', lazy: page(() => import('@/pages/TrackPage')) },
  { path: 'learn/:trackSlug/certificate', lazy: page(() => import('@/pages/CertificatePage')) },
  { path: 'learn/:trackSlug/:moduleSlug/:lessonSlug', lazy: page(() => import('@/pages/LessonPage')) },
  { path: 'practice', lazy: page(() => import('@/pages/PracticePage')) },
  { path: 'glossary', lazy: page(() => import('@/pages/GlossaryPage')) },
];

const domainRoutes: RouteObject[] = DOMAINS.map((d) => ({
  path: d.id,
  handle: { domain: d.id } satisfies DomainHandle,
  children: [{ index: true, lazy: page(d.home) }, ...coursePages(), ...(d.routes ?? []), { path: '*', element: <NotFoundPage /> }],
}));

/** Old URLs (before domains) move under /cloud, keeping query and #anchor. */
const legacyRoutes: RouteObject[] = [
  ...['roadmap', 'learn', 'learn/*', 'practice', 'glossary', 'lab', 'lab/*', 'explore'].map((path) => ({ path, element: <ToCloud /> })),
  { path: 'simulator', element: <ToCloud to="/lab" /> },
  // Features planned for later phases redirect home for now.
  { path: 'labs', element: <Navigate to="/" replace /> },
  { path: 'review', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: page(() => import('@/pages/HubPage')) },
          { path: 'settings', lazy: page(() => import('@/pages/SettingsPage')) },
          ...domainRoutes,
          ...legacyRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
