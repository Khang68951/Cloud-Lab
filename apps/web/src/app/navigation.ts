import { House, Settings, type LucideIcon } from 'lucide-react';
import { domainPath } from './paths';
import type { DomainDefinition } from '@/domains/types';

/** Label keys in the `nav` namespace. */
export type NavKey = 'hub' | 'domainHome' | 'roadmap' | 'learn' | 'glossary' | 'lab' | 'practice' | 'explore' | 'settings';

export interface NavItem {
  to: string;
  labelKey: NavKey;
  icon: LucideIcon;
  /** Only active on an exact URL match. */
  end?: boolean;
}

export interface NavSection {
  key: 'learn' | 'practice' | 'tools' | 'app';
  items: NavItem[];
}

/** App-level links, shown below every domain's own sections. */
export const APP_NAV: NavSection = {
  key: 'app',
  items: [
    { to: '/', labelKey: 'hub', icon: House, end: true },
    { to: '/settings', labelKey: 'settings', icon: Settings },
  ],
};

/** A domain's sidebar sections with absolute URLs. */
export function domainNav(domain: DomainDefinition): NavSection[] {
  return domain.nav.map((s) => ({
    key: s.key,
    items: s.items.map((i) => ({ to: domainPath(domain.id, i.to), labelKey: i.labelKey, icon: i.icon, end: i.to === '' })),
  }));
}
