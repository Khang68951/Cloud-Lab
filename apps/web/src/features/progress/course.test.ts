import { getTrack, lessonsOf } from '@cloudlab/content';
import { describe, expect, it } from 'vitest';
import type { Progress } from './api';
import { courseProgress, recommendedCourse, type CourseProgress } from './course';

const empty: Progress = { lessons: [], exercises: [] };

describe('courseProgress', () => {
  it('counts nothing on a fresh start and points to the first lesson', () => {
    const p = courseProgress(getTrack('aws')!, empty);
    expect(p.started).toBe(false);
    expect(p.completed).toBe(false);
    expect(p.nextLessonUrl).toBe('/learn/aws/foundations/lab-tour');
    expect(p.lessonsAvailable).toBeLessThanOrEqual(p.lessonsTotal);
  });

  it('is not complete while lessons are still being written, even if all written ones are done', () => {
    const aws = getTrack('aws')!;
    const lessons = lessonsOf(aws).map((l, i) => ({ key: l.key, completedAt: 1000 + i }));
    const p = courseProgress(aws, { lessons, exercises: [] });
    expect(p.lessonsDone).toBe(p.lessonsAvailable);
    expect(p.completed).toBe(p.lessonsAvailable === p.lessonsTotal && p.challengesTotal === 0);
    expect(p.nextLessonUrl).toBeNull();
  });

  it('recommends Core first, then a course whose prerequisites are done', () => {
    const fake = (slug: string, completed: boolean, available = 5): CourseProgress =>
      ({ slug, completed, lessonsAvailable: available, lessonsDone: completed ? available : 0 }) as CourseProgress;
    const base = Object.fromEntries(
      ['aws', 'aws-security', 'aws-networking', 'aws-compute', 'aws-data', 'aws-lab-practice', 'aws-serverless', 'aws-reliability', 'aws-cost', 'aws-devops', 'aws-analytics', 'aws-system-design'].map(
        (s) => [s, fake(s, false)],
      ),
    );
    expect(recommendedCourse(base)?.slug).toBe('aws');
    expect(recommendedCourse({ ...base, aws: fake('aws', true) })?.slug).toBe('aws-security');
  });
});
