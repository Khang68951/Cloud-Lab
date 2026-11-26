/**
 * Calibration helper for canvas challenges: shows how the starter and the
 * reference solution score against every requirement, for every course.
 * Usage: npm run challenges:report [-- <course-slug>]
 */
import { allExercises } from '@learninglab/content';
import { gradeCanvas, type CanvasChallenge } from '@learninglab/cloud-challenges';

const only = process.argv[2];
const challenges = allExercises
  .filter((e) => e.exercise.kind === 'canvas-design' || e.exercise.kind === 'canvas-fix')
  .filter((e) => !only || e.ref.track.slug === only)
  .map((e) => e.exercise as CanvasChallenge);

for (const ch of challenges) {
  console.log(`\n== ${ch.id}`);
  for (const [name, d] of [
    ['starter', ch.starter],
    ['reference', ch.reference],
  ] as const) {
    const g = gradeCanvas(ch, d);
    const t = g.sim.totals;
    console.log(
      `  ${name.padEnd(9)} ${g.passed ? 'PASS' : 'fail'} score=${g.score}  $${t.monthlyUsd.toFixed(0)}  p95=${t.p95Ms.toFixed(0)}ms  ` +
        `avail=${(t.availability * 100).toFixed(3)}%  err=${(t.errorRate * 100).toFixed(1)}%`,
    );
    for (const c of g.checks) if (!c.passed) console.log(`      ✗ ${c.label.en}${c.actual ? ` (${c.actual})` : ''}`);
  }
}
