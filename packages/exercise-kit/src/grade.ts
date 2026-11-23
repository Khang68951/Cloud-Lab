import { tx } from '@cloudlab/catalog';
import type { LocalizedText } from '@cloudlab/shared';
import { simulate, type SimResult } from '@cloudlab/sim-engine';
import { flowLabel, hasFlow } from './flow.ts';
import type { Answer, CanvasChallenge, CheckResult, Exercise, GradeResult, MetricKey, Requirement } from './types.ts';

const METRIC_LABEL: Record<MetricKey, (op: string, v: string) => LocalizedText> = {
  monthlyUsd: (op, v) => tx(`Monthly cost ${op} ${v}`, `Chi phí mỗi tháng ${op} ${v}`),
  latencyMs: (op, v) => tx(`Average latency ${op} ${v}`, `Độ trễ trung bình ${op} ${v}`),
  p95Ms: (op, v) => tx(`p95 latency ${op} ${v}`, `Độ trễ p95 ${op} ${v}`),
  availability: (op, v) => tx(`Availability ${op} ${v}`, `Availability ${op} ${v}`),
  errorRate: (op, v) => tx(`Error rate at peak ${op} ${v}`, `Tỉ lệ lỗi lúc cao điểm ${op} ${v}`),
  maxPeakRps: (op, v) => tx(`Handles a peak of ${op === '>=' ? 'at least' : 'at most'} ${v}`, `Chịu được đỉnh ${op === '>=' ? 'ít nhất' : 'tối đa'} ${v}`),
};

export function formatMetric(metric: MetricKey, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '∞';
  switch (metric) {
    case 'monthlyUsd':
      return `$${value.toFixed(value < 100 ? 2 : 0)}/mo`;
    case 'latencyMs':
    case 'p95Ms':
      return `${value.toFixed(0)} ms`;
    case 'availability':
      return `${(value * 100).toFixed(value >= 0.999 ? 3 : 2)}%`;
    case 'errorRate':
      return `${(value * 100).toFixed(1)}%`;
    case 'maxPeakRps':
      return `${Math.round(value).toLocaleString('en-US')} rps`;
  }
}

const SEVERITY_LABEL = {
  error: tx('No errors from the reviewer', 'Không còn lỗi (error) trong phần Đánh giá'),
  warning: tx('No errors or warnings from the reviewer', 'Không còn lỗi hay cảnh báo trong phần Đánh giá'),
  info: tx('No findings at all from the reviewer', 'Phần Đánh giá không còn mục nào'),
};

export function requirementLabel(r: Requirement): LocalizedText {
  switch (r.type) {
    case 'metric':
      return METRIC_LABEL[r.metric](r.op === '<=' ? '≤' : '≥', formatMetric(r.metric, r.value));
    case 'no-findings': {
      const base = SEVERITY_LABEL[r.severity];
      return r.pillar ? { en: `${base.en} (${r.pillar})`, vi: `${base.vi} (${r.pillar})` } : base;
    }
    case 'flow':
      return r.label ?? flowLabel(r.steps);
    default:
      return r.label;
  }
}

/** Evaluate one requirement against a design (and its simulation). */
export function checkRequirement(r: Requirement, design: CanvasChallenge['starter'], sim: SimResult): CheckResult {
  const label = requirementLabel(r);
  switch (r.type) {
    case 'metric': {
      const v = sim.totals[r.metric];
      const value = v === null ? Infinity : v;
      return { label, passed: r.op === '<=' ? value <= r.value : value >= r.value, actual: formatMetric(r.metric, v) };
    }
    case 'survives': {
      const chaosSim = simulate(design, r.chaos);
      return { label, passed: chaosSim.totals.survives === true && chaosSim.totals.errorRate < 0.01 };
    }
    case 'no-findings': {
      const order = { error: 0, warning: 1, info: 2 };
      const bad = sim.findings.filter((f) => order[f.severity] <= order[r.severity] && (!r.pillar || f.pillar === r.pillar));
      return { label, passed: bad.length === 0, actual: bad.length ? String(bad.length) : undefined };
    }
    case 'no-finding':
      return { label, passed: !sim.findings.some((f) => f.id.startsWith(r.prefix)) };
    case 'uses':
      return { label, passed: design.nodes.some((n) => r.services.includes(n.service)) };
    case 'not-uses':
      return { label, passed: !design.nodes.some((n) => r.services.includes(n.service)) };
    case 'flow':
      return { label, passed: hasFlow(design, r.steps) };
  }
}

/** Grade a canvas design; the challenge's scenario always wins over the design's. */
export function gradeCanvas(ex: CanvasChallenge, design: CanvasChallenge['starter']): GradeResult & { sim: SimResult } {
  const d = { ...design, scenario: ex.scenario };
  const sim = simulate(d);
  const checks = ex.requirements.map((r) => checkRequirement(r, d, sim));
  const passedCount = checks.filter((c) => c.passed).length;
  return {
    passed: passedCount === checks.length,
    score: checks.length ? Math.round((passedCount / checks.length) * 100) : 100,
    checks,
    sim,
  };
}

/** Pure grading entry point for every exercise kind. */
export function grade(ex: Exercise, answer: Answer): GradeResult {
  if (ex.kind !== answer.kind && !(ex.kind.startsWith('canvas') && answer.kind.startsWith('canvas'))) {
    throw new Error(`Answer kind ${answer.kind} does not match exercise ${ex.id} (${ex.kind})`);
  }
  switch (ex.kind) {
    case 'scenario-quiz': {
      const selected = new Set((answer as Extract<Answer, { kind: 'scenario-quiz' }>).selected);
      const checks = ex.choices.map((c) => ({ label: c.text, passed: selected.has(c.id) === c.correct }));
      const passed = checks.every((c) => c.passed);
      return { passed, score: passed ? 100 : 0, checks };
    }
    case 'estimation': {
      const value = (answer as Extract<Answer, { kind: 'estimation' }>).value;
      const err = ex.answer === 0 ? Math.abs(value) : Math.abs(value - ex.answer) / Math.abs(ex.answer);
      const passed = err <= ex.tolerance;
      const close = err <= ex.tolerance * 2;
      return {
        passed,
        score: passed ? 100 : close ? 50 : 0,
        checks: [
          {
            label: tx(`Within ±${Math.round(ex.tolerance * 100)}% of the answer`, `Sai số trong khoảng ±${Math.round(ex.tolerance * 100)}%`),
            passed,
            actual: `${Math.round(err * 100)}%`,
          },
        ],
      };
    }
    case 'canvas-design':
    case 'canvas-fix': {
      const { sim: _sim, ...rest } = gradeCanvas(ex, (answer as Extract<Answer, { design: unknown }>).design);
      return rest;
    }
  }
}
