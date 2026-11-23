import { designSchema, type Design } from '@cloudlab/catalog';

/** The free Lab autosaves here so a refresh never loses work. */
export const DRAFT_KEY = 'cloudlab.lab.draft';

export interface Draft {
  title: string;
  designId: number | null;
  design: Design;
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    const d = designSchema.safeParse(parsed.design);
    return d.success ? { title: String(parsed.title ?? ''), designId: parsed.designId ?? null, design: d.data } : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}
