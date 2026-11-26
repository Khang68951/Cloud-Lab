import { zValidator } from '@hono/zod-validator';
import { desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { exerciseAttempts, lessonProgress } from '../db/schema.ts';

const attemptSchema = z.object({
  exerciseId: z.string().min(1).max(200),
  kind: z.string().min(1).max(50),
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  hintsUsed: z.number().int().min(0).max(20).default(0),
  answer: z.unknown().optional(),
});

const lessonKeySchema = z.object({ key: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/) });

export interface ExerciseSummary {
  exerciseId: string;
  attempts: number;
  bestScore: number;
  passed: boolean;
  lastAt: number;
}

/**
 * Learning progress. Grading happens in the browser with the same pure
 * functions (@learninglab/exercise-kit); this is a single-user local app, so the
 * server just records results.
 */
export function progressRoutes(db: Db) {
  return new Hono()
    .get('/', (c) => {
      const lessons = db.select().from(lessonProgress).all();
      const rows = db
        .select({
          exerciseId: exerciseAttempts.exerciseId,
          attempts: sql<number>`count(*)`,
          bestScore: sql<number>`max(${exerciseAttempts.score})`,
          passed: sql<number>`max(${exerciseAttempts.passed})`,
          lastAt: sql<number>`max(${exerciseAttempts.createdAt})`,
        })
        .from(exerciseAttempts)
        .groupBy(exerciseAttempts.exerciseId)
        .all();
      const exercises: ExerciseSummary[] = rows.map((r) => ({ ...r, passed: Boolean(r.passed) }));
      return c.json({
        lessons: lessons.map((l) => ({ key: l.lessonKey, completedAt: l.completedAt.getTime() })),
        exercises,
      });
    })
    .put('/lessons/:track/:module/:lesson', (c) => {
      const { key } = lessonKeySchema.parse({ key: `${c.req.param('track')}/${c.req.param('module')}/${c.req.param('lesson')}` });
      db.insert(lessonProgress).values({ lessonKey: key }).onConflictDoNothing().run();
      return c.json({ key, completed: true });
    })
    .delete('/lessons/:track/:module/:lesson', (c) => {
      const key = `${c.req.param('track')}/${c.req.param('module')}/${c.req.param('lesson')}`;
      db.delete(lessonProgress).where(eq(lessonProgress.lessonKey, key)).run();
      return c.json({ key, completed: false });
    })
    .post('/attempts', zValidator('json', attemptSchema), (c) => {
      const a = c.req.valid('json');
      const row = db
        .insert(exerciseAttempts)
        .values({ ...a, answer: a.answer ?? null })
        .returning({ id: exerciseAttempts.id })
        .get();
      return c.json({ id: row.id }, 201);
    })
    .get('/attempts/:exerciseId', (c) => {
      const rows = db
        .select()
        .from(exerciseAttempts)
        .where(eq(exerciseAttempts.exerciseId, c.req.param('exerciseId')))
        .orderBy(desc(exerciseAttempts.createdAt))
        .limit(20)
        .all();
      return c.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })));
    })
    .delete('/', (c) => {
      db.delete(exerciseAttempts).run();
      db.delete(lessonProgress).run();
      return c.json({ reset: true });
    });
}
