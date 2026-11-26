import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Key/value settings. Values are JSON so new settings never need a migration;
 * shape and defaults live in `settingsSchema` (@learninglab/shared).
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

const now = sql`(unixepoch('subsec') * 1000)`;

/** A lesson the learner marked as done. Key = "<track>/<module>/<lesson>". */
export const lessonProgress = sqliteTable('lesson_progress', {
  lessonKey: text('lesson_key').primaryKey(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

/** Every submission of an exercise (quiz answer, estimate, canvas design). */
export const exerciseAttempts = sqliteTable(
  'exercise_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    exerciseId: text('exercise_id').notNull(),
    kind: text('kind').notNull(),
    passed: integer('passed', { mode: 'boolean' }).notNull(),
    score: integer('score').notNull(),
    hintsUsed: integer('hints_used').notNull().default(0),
    answer: text('answer', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (t) => [index('attempts_exercise_idx').on(t.exerciseId)],
);

/** Architecture diagrams saved from the Lab. */
export const designs = sqliteTable('designs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  graph: text('graph', { mode: 'json' }).notNull(),
  monthlyUsd: real('monthly_usd'),
  engineVersion: integer('engine_version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

// Later phases add: skill_mastery, lab_states, flashcards_review, ai_cache — see PLAN.md §13.
