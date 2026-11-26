import { buildDesign, getService, IN_VPC, listenPort, placementOf, SG_KEY, tx, type Design, type Scenario } from '@learninglab/catalog';
import type { CanvasChallenge, Estimation, Requirement, ScenarioQuiz } from '@learninglab/exercise-kit';
import type { Severity } from '@learninglab/sim-engine';
import type { LocalizedText, SkillTag } from '@learninglab/shared';

/** Bilingual text everywhere in content is written as `tx(english, vietnamese)`. */
type T = LocalizedText;

/**
 * Exercise builders shared by every course. `prefix` namespaces ids per course
 * so progress stays stable (e.g. "aws-networking" → "aws-networking.cidr-size").
 */
export function exerciseBuilders(prefix: string) {
  const quiz = (id: string, skills: SkillTag[], prompt: T, choices: [string, T, boolean, T][], hints: T[] = []): ScenarioQuiz => ({
    id: `${prefix}.${id}`,
    kind: 'scenario-quiz',
    skills,
    prompt,
    choices: choices.map(([id, text, correct, explain]) => ({ id, text, correct, explain })),
    hints,
  });
  const estimate = (
    id: string,
    skills: SkillTag[],
    prompt: T,
    unit: string,
    answer: number,
    tolerance: number,
    explain: T,
    hints: T[] = [],
  ): Estimation => ({
    id: `${prefix}.${id}`,
    kind: 'estimation',
    skills,
    prompt,
    unit,
    answer,
    tolerance,
    explain,
    hints,
  });
  /** Canvas challenge; `id` is written without the course prefix. */
  const challenge = (c: CanvasChallenge): CanvasChallenge => ({ ...c, id: `${prefix}.${c.id}` });
  return { quiz, estimate, challenge };
}

/** Traffic for a challenge: defaults overridden by what the challenge cares about. */
export const scenario = (s: Partial<Scenario> = {}): Scenario => ({
  rps: 100,
  peakMultiplier: 3,
  readRatio: 0.8,
  payloadKB: 5,
  region: 'us-east-1',
  ...s,
});

/** Empty canvas (just the users) — the usual starter for a canvas-design challenge. */
export const usersOnly = (s: Scenario) => buildDesign([['users', 'users', 0, 1]], [], s);

/**
 * Least-privilege security groups for a reference design: each resource opens
 * its port only to the security groups of the nodes wired into it (or to
 * 0.0.0.0/0 for callers outside the VPC, e.g. users → a public ALB). Rules
 * written by hand in the design are kept.
 */
export function withSecurityGroups(design: Design): Design {
  const byId = new Map(design.nodes.map((n) => [n.id, n]));
  const where = (id: string) => {
    const n = byId.get(id);
    const def = n && getService(n.service);
    return def ? placementOf(def, n.config) : 'managed';
  };
  const nodes = design.nodes.map((n) => {
    const def = getService(n.service);
    if (!def || typeof n.config[SG_KEY] === 'string' || !IN_VPC.has(where(n.id)) || def.id === 'lambda') return n;
    const port = listenPort(def, n.config);
    if (port === null) return n;
    const sources = design.edges
      .filter((e) => e.target === n.id)
      .map((e) => (IN_VPC.has(where(e.source)) ? `sg:${e.source}` : where(n.id) === 'public' ? '0.0.0.0/0' : null))
      .filter((s): s is string => s !== null);
    const rules = [...new Set(sources)].map((src) => `${port}<${src}`).join(',');
    return { ...n, config: { ...n.config, [SG_KEY]: rules } };
  });
  return { ...design, nodes };
}

/** Common challenge requirements. */
export const R = {
  cost: (max: number): Requirement => ({ type: 'metric', metric: 'monthlyUsd', op: '<=', value: max }),
  p95: (max: number): Requirement => ({ type: 'metric', metric: 'p95Ms', op: '<=', value: max }),
  availability: (min: number): Requirement => ({ type: 'metric', metric: 'availability', op: '>=', value: min }),
  errors: (max = 0.01): Requirement => ({ type: 'metric', metric: 'errorRate', op: '<=', value: max }),
  survivesAz: (
    label = tx('Keeps serving users when one Availability Zone goes down', 'Vẫn phục vụ người dùng khi một Availability Zone bị sập'),
  ): Requirement => ({ type: 'survives', chaos: { azDown: true }, label }),
  noFindings: (severity: Severity = 'error', pillar?: 'reliability' | 'performance' | 'cost' | 'security' | 'operational'): Requirement =>
    pillar ? { type: 'no-findings', severity, pillar } : { type: 'no-findings', severity },
  /** Every connection gets through (no blocked route or security group). */
  connected: (): Requirement => ({
    type: 'no-finding',
    prefix: 'blocked-edge',
    label: tx('Every connection gets through the network and security groups', 'Mọi kết nối đều qua được mạng và security group'),
  }),
  noServers: (): Requirement => ({
    type: 'not-uses',
    services: ['ec2', 'fargate', 'eks', 'ecs-ec2', 'lightsail', 'beanstalk'],
    label: tx('No servers or containers to manage', 'Không có server hay container nào phải quản lý'),
  }),
};

/**
 * Lesson outline entry. Its status is derived (see `buildCourse`): shown as
 * "being written" until it has its exercises; tests check both MDX files exist.
 */
export function lesson(slug: string, title: T, summary: T, estMinutes: number) {
  return { slug, title, summary, estMinutes };
}

/** Module outline entry. Practice badges and status are derived from its exercises. */
export function mod(slug: string, icon: string, title: T, summary: T, lessons: ReturnType<typeof lesson>[]) {
  return { slug, icon, title, summary, lessons };
}
