import { isCanvasChallenge, type CloudExercise } from '@learninglab/cloud-challenges';
import { tx } from '@learninglab/cloud-catalog';
import { buildDomain, type CourseExercises, type CourseModule, type DomainContent, type RoadmapStage } from '@learninglab/course-kit';
import type { TrackMeta } from '@learninglab/shared';
import { GLOSSARY } from './glossary.ts';
import * as analytics from './tracks/aws-analytics/index.ts';
import * as compute from './tracks/aws-compute/index.ts';
import * as cost from './tracks/aws-cost/index.ts';
import * as data from './tracks/aws-data/index.ts';
import * as devops from './tracks/aws-devops/index.ts';
import * as labPractice from './tracks/aws-lab-practice/index.ts';
import * as networking from './tracks/aws-networking/index.ts';
import * as reliability from './tracks/aws-reliability/index.ts';
import * as security from './tracks/aws-security/index.ts';
import * as serverless from './tracks/aws-serverless/index.ts';
import * as systemDesign from './tracks/aws-system-design/index.ts';
import * as core from './tracks/aws/index.ts';

export { GLOSSARY };
export { exerciseBuilders, R, scenario, usersOnly, withSecurityGroups } from './helpers.ts';

export const CLOUD_DOMAIN = 'cloud';

/**
 * Every Cloud course, in roadmap order. A new course = a folder under tracks/
 * exporting { track, exercises } + one line here.
 */
const COURSES: CourseModule<CloudExercise>[] = [
  core,
  security,
  networking,
  compute,
  data,
  labPractice,
  serverless,
  reliability,
  cost,
  devops,
  analytics,
  systemDesign,
];

const STAGES: RoadmapStage[] = [
  {
    stage: 1,
    title: tx('Foundations', 'Nền tảng'),
    body: tx('Start here: the AWS building blocks you use daily and how to connect them.', 'Bắt đầu từ đây: các "khối" AWS dùng hằng ngày và cách nối chúng.'),
  },
  {
    stage: 2,
    title: tx('Deep dives by area', 'Chuyên sâu theo mảng'),
    body: tx('Go deep on one area at a time: security, networking, compute, data.', 'Đào sâu từng mảng: bảo mật, mạng, compute, dữ liệu.'),
  },
  {
    stage: 3,
    title: tx('Across areas', 'Kết hợp nhiều mảng'),
    body: tx('Serverless, reliability and cost — they combine several areas.', 'Serverless, độ tin cậy và chi phí — cần kiến thức của nhiều mảng.'),
  },
  {
    stage: 4,
    title: tx('Operations & data', 'Vận hành & dữ liệu'),
    body: tx('Ship safely to production and get value from data.', 'Đưa hệ thống lên production an toàn và khai thác dữ liệu.'),
  },
  { stage: 5, title: tx('Capstone', 'Tổng hợp'), body: tx('Design real systems end to end.', 'Thiết kế trọn vẹn những hệ thống thật.') },
];

const built = buildDomain(CLOUD_DOMAIN, COURSES, { glossary: GLOSSARY, stages: STAGES });

/**
 * Security groups in Lab challenges start empty (the learner writes every
 * rule) once security groups have been studied: from this lesson on in its
 * course, and in every course that builds on that course. Earlier challenges
 * keep each port pre-opened so beginners can focus on the design.
 */
export const SG_LESSON = { track: 'aws-networking', module: 'vpc-design', lesson: 'security-groups' };

const requires = (slug: string, target: string): boolean => {
  const t = built.tracks.find((x) => x.slug === slug);
  return !!t && t.prerequisites.some((p) => p === target || requires(p, target));
};

function withSgMode(track: TrackMeta, exercises: CourseExercises<CloudExercise>): CourseExercises<CloudExercise> {
  const lessons = track.modules.flatMap((m) => m.lessons.map((l) => [m.slug, l.slug] as const));
  const from = track.slug === SG_LESSON.track ? lessons.findIndex(([m, l]) => m === SG_LESSON.module && l === SG_LESSON.lesson) : -1;
  const whole = requires(track.slug, SG_LESSON.track);
  if (!whole && from < 0) return exercises;
  return Object.fromEntries(
    track.modules.map((m) => [
      m.slug,
      Object.fromEntries(
        m.lessons.map((l) => {
          const manual = whole || lessons.findIndex(([mm, ll]) => mm === m.slug && ll === l.slug) >= from;
          const list = exercises[m.slug]?.[l.slug] ?? [];
          return [l.slug, manual ? list.map((e) => (isCanvasChallenge(e) ? { ...e, manualSg: true } : e)) : list];
        }),
      ),
    ]),
  );
}

/** The Cloud domain's courses, exercises, glossary and roadmap stages. */
export const cloudContent: DomainContent<CloudExercise> = {
  ...built,
  exercises: Object.fromEntries(built.tracks.map((t) => [t.slug, withSgMode(t, built.exercises[t.slug] ?? {})])),
};
