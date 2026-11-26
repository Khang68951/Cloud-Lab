/**
 * "Come back here" links between pages (e.g. a lesson opens a tool, the tool's
 * back button returns to the exercise card). Used by every domain.
 */

/** Only same-app paths are accepted from `?from=` (no protocol-relative or external URLs). */
export function safeFrom(v: string | null): string | null {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
}

/** Anchor id of an exercise card (ExerciseShell) — the lesson scrolls to it on return. */
export const exerciseAnchor = (id: string) => `ex-${id}`;

/** Builds a `?from=` value pointing back at the current page and an anchor on it. */
export function fromParam(pathname: string, anchor: string): string {
  return `from=${encodeURIComponent(`${pathname}#${anchor}`)}`;
}
