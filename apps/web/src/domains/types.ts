import type { Locale, LocalizedText } from '@learninglab/shared';
import type { LucideIcon } from 'lucide-react';
import type { MDXComponents } from 'mdx/types';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router';
import type { Exercise } from '@learninglab/content';
import type { NavKey } from '@/app/navigation';
import type { SearchEntry } from '@/features/search/searchIndex';

/** A page module, loaded only when its route is visited. */
export type PageLoader = () => Promise<{ default: ComponentType }>;

export interface DomainNavItem {
  /** Path inside the domain: '' = domain home, 'lab' = /<domain>/lab. */
  to: string;
  labelKey: NavKey;
  icon: LucideIcon;
}

export interface DomainNavSection {
  key: 'learn' | 'practice' | 'tools';
  items: DomainNavItem[];
}

export interface PlayerProps<E extends Exercise = Exercise> {
  exercise: E;
  index?: number;
}

/**
 * A subject area of Learning Lab (Cloud, and later others). The app shell,
 * hub, router and search are built from these definitions, so each domain
 * brings its own home page, sidebar, tools and exercise kinds while sharing
 * courses, lessons, practice, progress and certificates.
 *
 * Courses come from the domain's content package (`track.domain === id`).
 */
export interface DomainDefinition {
  /** URL prefix and the `domain` of its courses, e.g. "cloud" → /cloud. */
  id: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  icon: LucideIcon;
  /** Brand hue (0–360) of the domain: tints the primary colour inside it. */
  hue: number;
  /** Landing page at /<id>. */
  home: PageLoader;
  /** Sidebar while inside the domain. */
  nav: DomainNavSection[];
  /** The domain's own pages (relative paths), on top of the shared course pages. */
  routes?: RouteObject[];
  /** Players for the domain's own exercise kinds (the common kinds are built in). */
  players?: Partial<Record<string, LazyExoticComponent<ComponentType<PlayerProps>>>>;
  /** Extra components lesson MDX can use, loaded with the first lesson. */
  mdx?: () => Promise<MDXComponents>;
  /** Extra search results (tools, reference pages…). Courses, lessons and glossary are indexed for every domain. */
  search?: (locale: Locale) => SearchEntry[];
}
