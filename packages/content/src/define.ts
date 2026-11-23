import { trackMetaSchema, type ContentStatus, type TrackMeta, type TrackMetaInput } from '@cloudlab/shared';

/**
 * Declare a track. Validation runs at import time, so a typo in content
 * (bad slug, duplicate module, unknown exercise kind) fails fast in dev,
 * in tests and in `npm run check`.
 */
export function defineTrack(input: TrackMetaInput): TrackMeta {
  const parsed = trackMetaSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid track "${input.slug}":\n${issues}`);
  }
  return parsed.data;
}

/** "available" if every item is, "planned" if none is, otherwise "in-progress". */
function rollUp(statuses: ContentStatus[]): ContentStatus {
  if (statuses.length === 0) return 'planned';
  const ready = statuses.filter((s) => s === 'available').length;
  if (ready === statuses.length) return 'available';
  return ready === 0 && statuses.every((s) => s === 'planned') ? 'planned' : 'in-progress';
}

/**
 * Declare a course. Module and course status are derived from lesson status,
 * so marking a lesson `available` (once its MDX + exercises exist) is the only
 * thing to change when content ships.
 */
export function defineCourse(input: Omit<TrackMetaInput, 'status'>): TrackMeta {
  const track = defineTrack({ ...input, status: 'planned' });
  const modules = track.modules.map((m) => ({ ...m, status: rollUp(m.lessons.map((l) => l.status)) }));
  return { ...track, modules, status: rollUp(modules.map((m) => m.status)) };
}
