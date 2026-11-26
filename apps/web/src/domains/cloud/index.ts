import { tx } from '@learninglab/shared';
import { BookA, Cloud, Compass, Dumbbell, GraduationCap, House, Map, Workflow } from 'lucide-react';
import { lazy, type ComponentType } from 'react';
import type { DomainHandle } from '../useDomain';
import type { DomainDefinition, PageLoader, PlayerProps } from '../types';
import { CLOUD } from './paths';
import { cloudSearch } from './search';

const page = (load: PageLoader) => async () => ({ Component: (await load()).default });

/** Canvas challenges are solved in the Lab; their card in a lesson links there. */
const ChallengeCard = lazy(async () => ({
  default: (await import('./exercises/ChallengeCard')).ChallengeCard as unknown as ComponentType<PlayerProps>,
}));

/**
 * CloudLab: AWS / cloud system design. Beyond the shared course pages it has
 * the architecture Lab (canvas + simulator), canvas challenges and the
 * Service Explorer.
 */
export const cloudDomain: DomainDefinition = {
  id: CLOUD,
  name: tx('CloudLab', 'CloudLab'),
  tagline: tx('AWS & cloud system design', 'AWS & thiết kế hệ thống cloud'),
  description: tx(
    'Design architectures on a canvas, see cost, latency and availability live, break them with chaos and fix them. 12 courses from foundations to system design.',
    'Thiết kế kiến trúc trên canvas, xem ngay chi phí, độ trễ và availability, bật chaos để phá thử rồi sửa. 12 khoá từ nền tảng tới system design.',
  ),
  icon: Cloud,
  hue: 222,
  home: () => import('./pages/CloudHomePage'),
  nav: [
    {
      key: 'learn',
      items: [
        { to: '', labelKey: 'domainHome', icon: House },
        { to: 'roadmap', labelKey: 'roadmap', icon: Map },
        { to: 'learn', labelKey: 'learn', icon: GraduationCap },
        { to: 'glossary', labelKey: 'glossary', icon: BookA },
      ],
    },
    {
      key: 'practice',
      items: [
        { to: 'lab', labelKey: 'lab', icon: Workflow },
        { to: 'practice', labelKey: 'practice', icon: Dumbbell },
      ],
    },
    { key: 'tools', items: [{ to: 'explore', labelKey: 'explore', icon: Compass }] },
  ],
  routes: [
    { path: 'lab', lazy: page(() => import('./pages/LabPage')), handle: { fullBleed: true } satisfies DomainHandle },
    { path: 'lab/challenge/:exerciseId', lazy: page(() => import('./pages/ChallengePage')), handle: { fullBleed: true } satisfies DomainHandle },
    { path: 'explore', lazy: page(() => import('./pages/ExplorePage')) },
  ],
  players: { 'canvas-design': ChallengeCard, 'canvas-fix': ChallengeCard },
  mdx: async () => (await import('./mdx')).cloudMdx,
  search: cloudSearch,
};
