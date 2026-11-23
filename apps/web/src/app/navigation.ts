import { BookA, Compass, Dumbbell, GraduationCap, House, Map, Settings, Workflow, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  /** Key in the `nav` namespace. */
  labelKey: 'home' | 'roadmap' | 'learn' | 'glossary' | 'lab' | 'practice' | 'explore' | 'settings';
  icon: LucideIcon;
  /** Only active on an exact URL match. */
  end?: boolean;
}

export interface NavSection {
  key: 'learn' | 'practice' | 'tools';
  items: NavItem[];
}

/** Single source of truth for the sidebar and mobile menu. */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'learn',
    items: [
      { to: '/', labelKey: 'home', icon: House, end: true },
      { to: '/roadmap', labelKey: 'roadmap', icon: Map },
      { to: '/learn', labelKey: 'learn', icon: GraduationCap },
      { to: '/glossary', labelKey: 'glossary', icon: BookA },
    ],
  },
  {
    key: 'practice',
    items: [
      { to: '/lab', labelKey: 'lab', icon: Workflow },
      { to: '/practice', labelKey: 'practice', icon: Dumbbell },
    ],
  },
  {
    key: 'tools',
    items: [
      { to: '/explore', labelKey: 'explore', icon: Compass },
      { to: '/settings', labelKey: 'settings', icon: Settings },
    ],
  },
];
