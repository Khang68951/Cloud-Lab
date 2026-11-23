import { designSchema } from '@cloudlab/catalog';
import { zValidator } from '@hono/zod-validator';
import { desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { designs } from '../db/schema.ts';

const bodySchema = z.object({
  title: z.string().trim().min(1).max(100),
  graph: designSchema,
  monthlyUsd: z.number().nonnegative().nullable().optional(),
  engineVersion: z.number().int().positive().default(1),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

const toJson = (r: typeof designs.$inferSelect) => ({
  ...r,
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
});

/** Architecture diagrams saved from the Lab. */
export function designRoutes(db: Db) {
  return new Hono()
    .get('/', (c) => {
      const rows = db
        .select({ id: designs.id, title: designs.title, monthlyUsd: designs.monthlyUsd, updatedAt: designs.updatedAt })
        .from(designs)
        .orderBy(desc(designs.updatedAt))
        .all();
      return c.json(rows.map((r) => ({ ...r, updatedAt: r.updatedAt.getTime() })));
    })
    .get('/:id', zValidator('param', idParam), (c) => {
      const row = db.select().from(designs).where(eq(designs.id, c.req.valid('param').id)).get();
      if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Design not found' } }, 404);
      return c.json(toJson(row));
    })
    .post('/', zValidator('json', bodySchema), (c) => {
      const row = db.insert(designs).values(c.req.valid('json')).returning().get();
      return c.json(toJson(row), 201);
    })
    .put('/:id', zValidator('param', idParam), zValidator('json', bodySchema), (c) => {
      const row = db
        .update(designs)
        .set({ ...c.req.valid('json'), updatedAt: sql`(unixepoch('subsec') * 1000)` })
        .where(eq(designs.id, c.req.valid('param').id))
        .returning()
        .get();
      if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Design not found' } }, 404);
      return c.json(toJson(row));
    })
    .delete('/:id', zValidator('param', idParam), (c) => {
      db.delete(designs).where(eq(designs.id, c.req.valid('param').id)).run();
      return c.json({ deleted: true });
    });
}
