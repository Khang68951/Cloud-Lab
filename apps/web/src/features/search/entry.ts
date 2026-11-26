export type SearchKind = 'course' | 'lesson' | 'challenge' | 'service' | 'term';

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  subtitle: string;
  url: string;
  /** Lower-cased, accent-free text used for matching. */
  haystack: string;
  titleKey: string;
}

export const termId = (term: string) => `term-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** Lower-case and strip accents so "bao mat" finds "bảo mật". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

export function searchEntry(kind: SearchKind, title: string, subtitle: string, url: string, extra = ''): SearchEntry {
  return { kind, title, subtitle, url, titleKey: normalize(title), haystack: normalize(`${title} ${subtitle} ${extra}`) };
}
