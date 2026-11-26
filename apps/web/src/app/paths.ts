import type { TrackMeta } from '@learninglab/shared';

/**
 * URL builders. Every course page lives under its domain:
 *   /<domain>                      domain home
 *   /<domain>/learn/<course>/...   course, lesson, certificate
 * so links are built from the course itself (tracks carry their domain).
 */
export const domainPath = (domain: string, sub = '') => (sub ? `/${domain}/${sub}` : `/${domain}`);

export const coursePath = (track: Pick<TrackMeta, 'domain' | 'slug'>) => `/${track.domain}/learn/${track.slug}`;

export const lessonPath = (ref: { track: Pick<TrackMeta, 'domain' | 'slug'>; module: { slug: string }; lesson: { slug: string } }) =>
  `${coursePath(ref.track)}/${ref.module.slug}/${ref.lesson.slug}`;

export const certificatePath = (track: Pick<TrackMeta, 'domain' | 'slug'>) => `${coursePath(track)}/certificate`;

/** The course and lesson slugs of a lesson URL, or null. */
export function parseLessonPath(path: string): { track: string; module: string; lesson: string } | null {
  const m = path.split(/[?#]/)[0]!.match(/^\/[a-z0-9-]+\/learn\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  return m ? { track: m[1]!, module: m[2]!, lesson: m[3]! } : null;
}
