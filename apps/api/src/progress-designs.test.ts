import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getTemplate } from '@learninglab/cloud-catalog';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { adoptLegacyDb, createDb } from './db/client.ts';

const json = (body: unknown, method = 'POST') => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function setup() {
  return createApp({ db: createDb(':memory:') });
}

describe('progress', () => {
  it('records attempts and summarises best score per exercise', async () => {
    const app = setup();
    await app.request('/api/progress/attempts', json({ exerciseId: 'q1', kind: 'scenario-quiz', passed: false, score: 0 }));
    await app.request('/api/progress/attempts', json({ exerciseId: 'q1', kind: 'scenario-quiz', passed: true, score: 100 }));
    const body = (await (await app.request('/api/progress')).json()) as {
      exercises: { exerciseId: string; attempts: number; bestScore: number; passed: boolean }[];
    };
    expect(body.exercises).toEqual([expect.objectContaining({ exerciseId: 'q1', attempts: 2, bestScore: 100, passed: true })]);
  });

  it('marks and unmarks lessons idempotently', async () => {
    const app = setup();
    await app.request('/api/progress/lessons/aws/foundations/regions-azs', { method: 'PUT' });
    await app.request('/api/progress/lessons/aws/foundations/regions-azs', { method: 'PUT' });
    let body = (await (await app.request('/api/progress')).json()) as { lessons: { key: string }[] };
    expect(body.lessons.map((l) => l.key)).toEqual(['aws/foundations/regions-azs']);
    await app.request('/api/progress/lessons/aws/foundations/regions-azs', { method: 'DELETE' });
    body = (await (await app.request('/api/progress')).json()) as { lessons: { key: string }[] };
    expect(body.lessons).toEqual([]);
  });

  it('validates attempts', async () => {
    const app = setup();
    const res = await app.request('/api/progress/attempts', json({ exerciseId: 'q1', kind: 'x', passed: true, score: 101 }));
    expect(res.status).toBe(400);
  });
});

describe('designs', () => {
  it('creates, lists, updates and deletes a design', async () => {
    const app = setup();
    const graph = getTemplate('three-tier')!.design;
    const created = (await (await app.request('/api/designs', json({ title: 'My 3-tier', graph, monthlyUsd: 593 }))).json()) as {
      id: number;
    };
    expect(created.id).toBeGreaterThan(0);

    const list = (await (await app.request('/api/designs')).json()) as { title: string }[];
    expect(list.map((d) => d.title)).toEqual(['My 3-tier']);

    const upd = await app.request(`/api/designs/${created.id}`, json({ title: 'Renamed', graph }, 'PUT'));
    expect(upd.status).toBe(200);
    const one = (await (await app.request(`/api/designs/${created.id}`)).json()) as { title: string; graph: unknown };
    expect(one.title).toBe('Renamed');
    expect(one.graph).toEqual(graph);

    await app.request(`/api/designs/${created.id}`, { method: 'DELETE' });
    expect((await app.request(`/api/designs/${created.id}`)).status).toBe(404);
  });

  it('rejects malformed graphs', async () => {
    const app = setup();
    const res = await app.request('/api/designs', json({ title: 'bad', graph: { nodes: 'nope' } }));
    expect(res.status).toBe(400);
  });
});

describe('data backup', () => {
  it('exports everything and imports it into a fresh database', async () => {
    const a = setup();
    await a.request('/api/settings', json({ displayName: 'Khang', locale: 'en' }, 'PUT'));
    await a.request('/api/progress/lessons/aws/foundations/lab-tour', { method: 'PUT' });
    await a.request('/api/progress/attempts', json({ exerciseId: 'q1', kind: 'scenario-quiz', passed: true, score: 100 }));
    await a.request('/api/designs', json({ title: 'D', graph: getTemplate('three-tier')!.design }));
    const backup = await (await a.request('/api/data/export')).json();

    const b = setup();
    await b.request('/api/progress/attempts', json({ exerciseId: 'old', kind: 'x', passed: false, score: 0 }));
    const res = await b.request('/api/data/import', json(backup));
    expect(res.status).toBe(200);
    expect(await (await b.request('/api/data/export')).json()).toMatchObject({
      settings: expect.arrayContaining([expect.objectContaining({ key: 'displayName', value: 'Khang' })]),
      lessons: [expect.objectContaining({ lessonKey: 'aws/foundations/lab-tour' })],
      attempts: [expect.objectContaining({ exerciseId: 'q1', passed: true })],
      designs: [expect.objectContaining({ title: 'D' })],
    });
  });

  it('accepts backups made before the rename (app: "cloudlab")', async () => {
    const backup = (await (await setup().request('/api/data/export')).json()) as Record<string, unknown>;
    expect(backup.app).toBe('learninglab');
    const res = await setup().request('/api/data/import', json({ ...backup, app: 'cloudlab' }));
    expect(res.status).toBe(200);
  });

  it('rejects files that are not Learning Lab backups', async () => {
    const res = await setup().request('/api/data/import', json({ hello: 'world' }));
    expect(res.status).toBe(400);
  });
});

describe('legacy database file', () => {
  it('moves the old file and its side files to the new name, once', () => {
    const dir = mkdtempSync(join(tmpdir(), 'll-db-'));
    const legacy = join(dir, 'cloudlab.db');
    const next = join(dir, 'learninglab.db');
    writeFileSync(legacy, 'x');
    writeFileSync(`${legacy}-wal`, 'w');
    expect(adoptLegacyDb(legacy, next)).toBe(true);
    expect([existsSync(next), existsSync(`${next}-wal`), existsSync(legacy)]).toEqual([true, true, false]);
    writeFileSync(legacy, 'y');
    expect(adoptLegacyDb(legacy, next)).toBe(false); // never overwrites the current file
  });
});
