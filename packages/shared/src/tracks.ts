import { z } from 'zod';
import { localizedTextSchema } from './i18n.ts';
import { exerciseKindSchema } from './exercises.ts';

/**
 * Content model. CloudLab is organised as:
 *
 *   Track (e.g. "aws", later "kubernetes", "databases", ...)
 *     └─ Module (e.g. "networking")
 *          └─ Lesson (short theory + several exercises)
 *
 * Nothing in the app is AWS-specific at this level: a new subject is just a
 * new Track registered in `@cloudlab/content`.
 */

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case (a-z, 0-9, -)');

export const LEVELS = ['foundation', 'intermediate', 'advanced'] as const;
export type CourseLevel = (typeof LEVELS)[number];

export const STATUSES = ['available', 'in-progress', 'planned'] as const;
export const statusSchema = z.enum(STATUSES);
export type ContentStatus = z.infer<typeof statusSchema>;

/**
 * Skill tags drive mastery tracking & recommendations.
 * Format: `<track>.<area>.<skill>`, e.g. `aws.networking.security-groups`.
 */
export const skillTagSchema = z
  .string()
  .regex(/^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/, 'skill tag must look like track.area.skill');
export type SkillTag = z.infer<typeof skillTagSchema>;

export const lessonMetaSchema = z.object({
  slug,
  title: localizedTextSchema,
  summary: localizedTextSchema.optional(),
  estMinutes: z.number().int().positive().optional(),
  status: statusSchema.default('planned'),
});
export type LessonMeta = z.infer<typeof lessonMetaSchema>;

export const moduleMetaSchema = z.object({
  slug,
  title: localizedTextSchema,
  summary: localizedTextSchema,
  /** Lucide icon name, resolved by the web app's icon registry. */
  icon: z.string().default('book'),
  /** Kinds of practice this module will use (see Exercise Kit). Shown as badges. */
  practice: z.array(exerciseKindSchema).default([]),
  status: statusSchema.default('planned'),
  lessons: z.array(lessonMetaSchema).default([]),
});
export type ModuleMeta = z.infer<typeof moduleMetaSchema>;

export const trackMetaSchema = z
  .object({
    slug,
    title: localizedTextSchema,
    tagline: localizedTextSchema,
    description: localizedTextSchema,
    icon: z.string().default('graduation-cap'),
    /** Accent hue (0–360) used for the track's colour in both themes. */
    hue: z.number().min(0).max(360).default(210),
    status: statusSchema.default('planned'),
    /** Difficulty shown on the course card. */
    level: z.enum(LEVELS).default('foundation'),
    /** Column in the learning roadmap (1 = start here). */
    stage: z.number().int().min(1).max(9).default(1),
    /** Courses that should be completed first (slugs). */
    prerequisites: z.array(slug).default([]),
    /** Rough total study time, hours. */
    estHours: z.number().positive().optional(),
    /** "After this course you can…" bullet points. */
    outcomes: z.array(localizedTextSchema).default([]),
    modules: z.array(moduleMetaSchema).default([]),
  })
  .superRefine((track, ctx) => {
    const seen = new Set<string>();
    track.modules.forEach((m, i) => {
      if (seen.has(m.slug)) {
        ctx.addIssue({ code: 'custom', path: ['modules', i, 'slug'], message: `duplicate module slug "${m.slug}"` });
      }
      seen.add(m.slug);
      const lessonSlugs = new Set<string>();
      m.lessons.forEach((l, j) => {
        if (lessonSlugs.has(l.slug)) {
          ctx.addIssue({
            code: 'custom',
            path: ['modules', i, 'lessons', j, 'slug'],
            message: `duplicate lesson slug "${l.slug}"`,
          });
        }
        lessonSlugs.add(l.slug);
      });
    });
  });
export type TrackMeta = z.infer<typeof trackMetaSchema>;
export type TrackMetaInput = z.input<typeof trackMetaSchema>;
