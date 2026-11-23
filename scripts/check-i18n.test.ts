import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkI18n } from './check-i18n.ts';

function fixture(files: Record<string, unknown>) {
  const root = mkdtempSync(join(tmpdir(), 'i18n-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, JSON.stringify(content));
  }
  return root;
}

describe('checkI18n', () => {
  it('passes on the real project', () => {
    const root = resolve(fileURLToPath(import.meta.url), '../..');
    expect(checkI18n(root)).toEqual([]);
  });

  it('reports missing keys, empty strings and missing files', () => {
    const root = fixture({
      'apps/x/locales/en/a.json': { hello: 'Hello', nested: { bye: 'Bye' } },
      'apps/x/locales/vi/a.json': { hello: '' },
      'apps/x/locales/en/b.json': { only: 'en' },
    });
    const messages = checkI18n(root).map((p) => `${p.file}: ${p.message}`);
    expect(messages).toContain('apps/x/locales/vi/a.json: missing key "nested.bye"');
    expect(messages).toContain('apps/x/locales/vi/a.json: empty string at "hello"');
    expect(messages).toContain('apps/x/locales/vi/b.json: missing namespace file');
  });
});
