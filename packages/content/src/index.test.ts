import { describe, expect, it } from 'vitest';
import { allExercises, contentDomains, exercisesOf, findLesson, getExercise, getTrack, lessonsOf, roadmapStages, tracks, tracksOf } from './index.ts';

describe('course registry', () => {
  it('has unique course slugs across every domain (they key lesson progress)', () => {
    const slugs = tracks.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has unique exercise ids across every domain and resolves them', () => {
    const ids = allExercises.map((e) => e.exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getExercise(ids[0]!)?.exercise.id).toBe(ids[0]);
  });

  it('splits courses and exercises by domain', () => {
    expect(contentDomains).toContain('cloud');
    for (const d of contentDomains) {
      expect(tracksOf(d).length, d).toBeGreaterThan(0);
      expect(tracksOf(d).every((t) => t.domain === d)).toBe(true);
      expect(exercisesOf(d).every((e) => e.ref.track.domain === d)).toBe(true);
    }
    expect(contentDomains.flatMap((d) => tracksOf(d)).length).toBe(tracks.length);
    expect(tracksOf('nope')).toEqual([]);
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

  it('roadmap stages of a domain hold all of its courses, in order', () => {
    const stages = roadmapStages('cloud');
    expect(stages.map((s) => s.stage)).toEqual([...stages.map((s) => s.stage)].sort((a, b) => a - b));
    expect(stages.flatMap((s) => s.courses).length).toBe(tracksOf('cloud').length);
    expect(stages.every((s) => s.title.vi)).toBe(true);
  });
});
