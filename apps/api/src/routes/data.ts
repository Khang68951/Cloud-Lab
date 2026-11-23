import { designSchema } from '@cloudlab/catalog';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { designs, exerciseAttempts, lessonProgress, settings } from '../db/schema.ts';

export const BACKUP_VERSION = 1;

const backupSchema = z.object({
  app: z.literal('cloudlab'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.number(),
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })),
  lessons: z.array(z.object({ lessonKey: z.string(), completedAt: z.number() })),
  attempts: z.array(
    z.object({
      exerciseId: z.string(),
      kind: z.string(),
      passed: z.boolean(),
      score: z.number().int().min(0).max(100),
      hintsUsed: z.number().int().min(0),
      answer: z.unknown().optional(),
      createdAt: z.number(),
    }),
  ),
  designs: z.array(
    z.object({
      title: z.string().min(1).max(100),
      graph: designSchema,
      monthlyUsd: z.number().nullable(),
      engineVersion: z.number().int(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
  ),
});
export type Backup = z.infer<typeof backupSchema>;

/**
 * Whole-database backup: export everything as one JSON file, import it back
 * (replacing current data). Lets the learner move between machines.
 */
export function dataRoutes(db: Db) {
  return new Hono()
    .get('/export', (c) => {
      const backup: Backup = {
        app: 'cloudlab',
        version: BACKUP_VERSION,
        exportedAt: Date.now(),
        settings: db.select().from(settings).all().map((r) => ({ key: r.key, value: r.value })),
        lessons: db
          .select()
          .from(lessonProgress)
          .all()
          .map((r) => ({ lessonKey: r.lessonKey, completedAt: r.completedAt.getTime() })),
        attempts: db
          .select()
          .from(exerciseAttempts)
          .all()
          .map((r) => ({
            exerciseId: r.exerciseId,
            kind: r.kind,
            passed: r.passed,
            score: r.score,
            hintsUsed: r.hintsUsed,
            answer: r.answer ?? undefined,
            createdAt: r.createdAt.getTime(),
          })),
        designs: db
          .select()
          .from(designs)
          .all()
          .map((r) => ({
            title: r.title,
            graph: designSchema.parse(r.graph),
            monthlyUsd: r.monthlyUsd,
            engineVersion: r.engineVersion,
            createdAt: r.createdAt.getTime(),
            updatedAt: r.updatedAt.getTime(),
          })),
      };
      return c.json(backup);
    })
    .post('/import', zValidator('json', backupSchema), (c) => {
      const b = c.req.valid('json');
      db.transaction((tx) => {
        tx.delete(settings).run();
        tx.delete(lessonProgress).run();
        tx.delete(exerciseAttempts).run();
        tx.delete(designs).run();
        for (const s of b.settings) tx.insert(settings).values({ key: s.key, value: s.value ?? null }).run();
        for (const l of b.lessons) tx.insert(lessonProgress).values({ lessonKey: l.lessonKey, completedAt: new Date(l.completedAt) }).run();
        for (const a of b.attempts)
          tx.insert(exerciseAttempts)
            .values({ ...a, answer: a.answer ?? null, createdAt: new Date(a.createdAt) })
            .run();
        for (const d of b.designs)
          tx.insert(designs)
            .values({ ...d, createdAt: new Date(d.createdAt), updatedAt: new Date(d.updatedAt) })
            .run();
      });
      return c.json({
        imported: { lessons: b.lessons.length, attempts: b.attempts.length, designs: b.designs.length, settings: b.settings.length },
      });
    });
}
