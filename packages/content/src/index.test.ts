import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grade, gradeCanvas } from '@cloudlab/exercise-kit';
import { describe, expect, it } from 'vitest';
import { AWS_EXERCISES } from './tracks/aws/exercises.ts';
import { allExercises, defineTrack, findLesson, getExercise, getTrack, lessonExercises, lessonsOf, tracks } from './index.ts';

describe('content registry', () => {
  it('has unique track slugs', () => {
    const slugs = tracks.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has a Vietnamese translation for every title and summary', () => {
    const missing: string[] = [];
    for (const t of tracks) {
      for (const [field, text] of Object.entries({ title: t.title, tagline: t.tagline, description: t.description })) {
        if (!text.vi) missing.push(`${t.slug}.${field}`);
      }
      for (const m of t.modules) {
        if (!m.title.vi) missing.push(`${t.slug}/${m.slug}.title`);
        if (!m.summary.vi) missing.push(`${t.slug}/${m.slug}.summary`);
        for (const l of m.lessons) if (!l.title.vi || (l.summary && !l.summary.vi)) missing.push(`${t.slug}/${m.slug}/${l.slug}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('looks tracks and lessons up, with prev/next navigation', () => {
    expect(getTrack('aws')?.modules.length).toBeGreaterThan(10);
    expect(getTrack('nope')).toBeUndefined();
    const first = findLesson('aws', 'foundations', 'lab-tour')!;
    expect(first.prev).toBeUndefined();
    expect(first.next?.lesson.slug).toBe('regions-azs');
    const all = lessonsOf(getTrack('aws')!);
    expect(findLesson('aws', all.at(-1)!.module.slug, all.at(-1)!.lesson.slug)!.next).toBeUndefined();
  });

  it('every exercise map entry points to a real lesson', () => {
    const aws = getTrack('aws')!;
    for (const [module, lessons] of Object.entries(AWS_EXERCISES)) {
      for (const lesson of Object.keys(lessons)) {
        expect(aws.modules.find((m) => m.slug === module)?.lessons.find((l) => l.slug === lesson), `${module}/${lesson}`).toBeDefined();
      }
    }
  });

  it('has unique exercise ids and resolves them', () => {
    const ids = allExercises.map((e) => e.exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getExercise(ids[0]!)?.exercise.id).toBe(ids[0]);
  });

  it('quizzes are well-formed and their correct answer grades as passed', () => {
    for (const { exercise: ex } of allExercises) {
      if (ex.kind !== 'scenario-quiz') continue;
      expect(ex.choices.some((c) => c.correct), ex.id).toBe(true);
      expect(new Set(ex.choices.map((c) => c.id)).size, ex.id).toBe(ex.choices.length);
      for (const c of ex.choices) expect(c.text.vi && c.explain.vi, `${ex.id}/${c.id}`).toBeTruthy();
      const right = ex.choices.filter((c) => c.correct).map((c) => c.id);
      expect(grade(ex, { kind: 'scenario-quiz', selected: right }).passed, ex.id).toBe(true);
      const wrong = ex.choices.filter((c) => !c.correct).map((c) => c.id);
      expect(grade(ex, { kind: 'scenario-quiz', selected: wrong }).passed, ex.id).toBe(false);
    }
  });

  it('estimations accept their own answer', () => {
    for (const { exercise: ex } of allExercises) {
      if (ex.kind !== 'estimation') continue;
      expect(grade(ex, { kind: 'estimation', value: ex.answer }).passed, ex.id).toBe(true);
      expect(grade(ex, { kind: 'estimation', value: ex.answer * 3 }).passed, ex.id).toBe(false);
    }
  });

  it('canvas challenges: starter fails, reference passes', () => {
    for (const { exercise: ex } of allExercises) {
      if (ex.kind !== 'canvas-design' && ex.kind !== 'canvas-fix') continue;
      expect(gradeCanvas(ex, ex.starter).passed, `${ex.id} starter`).toBe(false);
      const ref = gradeCanvas(ex, ex.reference);
      expect(ref.checks.filter((c) => !c.passed).map((c) => c.label.en), `${ex.id} reference`).toEqual([]);
    }
  });

  it('every available lesson has MDX in both languages; planned lessons have no exercises yet', () => {
    const dir = resolve(fileURLToPath(import.meta.url), '../tracks');
    const problems: string[] = [];
    for (const t of tracks) {
      for (const ref of lessonsOf(t)) {
        const base = `${dir}/${t.slug}/lessons/${ref.module.slug}/${ref.lesson.slug}`;
        if (ref.lesson.status === 'available') {
          for (const lang of ['vi', 'en']) if (!existsSync(`${base}.${lang}.mdx`)) problems.push(`missing ${base}.${lang}.mdx`);
        } else if (lessonExercises(t.slug, ref.module.slug, ref.lesson.slug).length > 0) {
          problems.push(`${ref.key} is planned but already has exercises — mark it available`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('lesson MDX only uses supported Callout types', () => {
    const dir = resolve(fileURLToPath(import.meta.url), '../tracks');
    const allowed = new Set(['tip', 'warning', 'info', 'key']);
    const bad: string[] = [];
    for (const t of tracks) {
      for (const ref of lessonsOf(t).filter((l) => l.lesson.status === 'available')) {
        for (const lang of ['vi', 'en']) {
          const file = `${dir}/${t.slug}/lessons/${ref.module.slug}/${ref.lesson.slug}.${lang}.mdx`;
          for (const m of readFileSync(file, 'utf8').matchAll(/<Callout type="([^"]+)"/g)) {
            if (!allowed.has(m[1]!)) bad.push(`${ref.key}.${lang}: ${m[1]}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every available lesson has at least 3 exercises', () => {
    const thin = tracks.flatMap((t) =>
      lessonsOf(t)
        .filter((l) => l.lesson.status === 'available')
        .filter((l) => lessonExercises(t.slug, l.module.slug, l.lesson.slug).length < 3)
        .map((l) => l.key),
    );
    expect(thin).toEqual([]);
  });

  it('roadmap: prerequisites exist and come from an earlier stage (so there are no cycles)', () => {
    const problems: string[] = [];
    for (const t of tracks) {
      for (const p of t.prerequisites) {
        const pre = getTrack(p);
        if (!pre) problems.push(`${t.slug} requires unknown course ${p}`);
        else if (pre.stage >= t.stage) problems.push(`${t.slug} (stage ${t.stage}) requires ${p} (stage ${pre.stage})`);
      }
      if (t.stage > 1 && t.prerequisites.length === 0) problems.push(`${t.slug} has no prerequisites`);
      if (t.outcomes.length === 0 || t.outcomes.some((o) => !o.vi)) problems.push(`${t.slug} needs bilingual outcomes`);
    }
    expect(problems).toEqual([]);
  });

  it('course status is derived from its lessons', () => {
    for (const t of tracks) {
      const statuses = lessonsOf(t).map((l) => l.lesson.status);
      const ready = statuses.filter((s) => s === 'available').length;
      const expected = ready === statuses.length ? 'available' : ready === 0 ? 'planned' : 'in-progress';
      expect(t.status, t.slug).toBe(expected);
    }
  });

  const base = { title: { en: 'x' }, tagline: { en: 'x' }, description: { en: 'x' } };

  it('rejects bad slugs and unknown exercise kinds with a readable error', () => {
    expect(() =>
      defineTrack({
        ...base,
        slug: 'Bad Slug',
        modules: [{ slug: 'a', title: { en: 'A' }, summary: { en: 'A' }, practice: ['not-a-kind' as never] }],
      }),
    ).toThrowError(/slug: must be kebab-case[\s\S]*modules\.0\.practice\.0/);
  });

  it('rejects duplicate module and lesson slugs', () => {
    const lesson = { slug: 'l', title: { en: 'L' } };
    expect(() =>
      defineTrack({
        ...base,
        slug: 'ok',
        modules: [
          { slug: 'a', title: { en: 'A' }, summary: { en: 'A' }, lessons: [lesson, lesson] },
          { slug: 'a', title: { en: 'A' }, summary: { en: 'A' } },
        ],
      }),
    ).toThrowError(/duplicate lesson slug "l"[\s\S]*duplicate module slug "a"/);
  });
});
