/**
 * Verifies that every language has exactly the same UI string keys.
 *
 * Scans every `locales/` folder under apps/ and packages/ with the layout
 *   locales/<lang>/<namespace>.json
 * and reports missing/extra keys, empty strings and missing namespace files.
 *
 * Usage: npm run i18n:check
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES } from '@cloudlab/shared';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export interface I18nProblem {
  file: string;
  message: string;
}

function flatten(value: Json, prefix = '', out = new Map<string, Json>()): Map<string, Json> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, value);
  }
  return out;
}

function findLocaleDirs(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === 'locales') found.push(full);
    else findLocaleDirs(full, found);
  }
  return found;
}

export function checkI18n(root: string): I18nProblem[] {
  const problems: I18nProblem[] = [];
  const dirs = ['apps', 'packages']
    .map((d) => join(root, d))
    .filter(existsSync)
    .flatMap((d) => findLocaleDirs(d));

  for (const dir of dirs) {
    const rel = (p: string) => relative(root, p).replaceAll('\\', '/');
    const namespaces = new Set<string>();
    for (const lang of LOCALES) {
      const langDir = join(dir, lang);
      if (!existsSync(langDir)) {
        problems.push({ file: rel(langDir), message: `missing language folder "${lang}"` });
        continue;
      }
      for (const f of readdirSync(langDir)) if (f.endsWith('.json')) namespaces.add(f);
    }

    for (const ns of namespaces) {
      const maps = new Map<string, Map<string, Json>>();
      for (const lang of LOCALES) {
        const file = join(dir, lang, ns);
        if (!existsSync(file)) {
          problems.push({ file: rel(file), message: 'missing namespace file' });
          continue;
        }
        try {
          maps.set(lang, flatten(JSON.parse(readFileSync(file, 'utf8')) as Json));
        } catch (e) {
          problems.push({ file: rel(file), message: `invalid JSON: ${(e as Error).message}` });
        }
      }

      const allKeys = new Set([...maps.values()].flatMap((m) => [...m.keys()]));
      for (const [lang, map] of maps) {
        const file = rel(join(dir, lang, ns));
        for (const key of allKeys) {
          if (!map.has(key)) problems.push({ file, message: `missing key "${key}"` });
        }
        for (const [key, value] of map) {
          if (value === '') problems.push({ file, message: `empty string at "${key}"` });
          if (Array.isArray(value)) {
            const other = [...maps.entries()].find(([l]) => l !== lang)?.[1].get(key);
            if (Array.isArray(other) && other.length !== value.length) {
              problems.push({ file, message: `array "${key}" has ${value.length} items, other language has ${other.length}` });
            }
          }
        }
      }
    }
  }
  return problems;
}

// Run as a script (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const problems = checkI18n(root);
  if (problems.length === 0) {
    console.log(`✔ i18n: all locales (${LOCALES.join(', ')}) have matching keys`);
  } else {
    for (const p of problems) console.error(`✖ ${p.file}: ${p.message}`);
    console.error(`\n${problems.length} i18n problem(s) found`);
    process.exit(1);
  }
}
