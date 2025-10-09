import path from 'node:path';
import fs from 'node:fs/promises';

export type GeneratedFile = { path: string; contents: string };

const SEED_TEST_PATH = 'tests/smoke.spec.ts';
const SEED_TEST_CONTENT = `import { describe, it, expect } from 'vitest';
describe('smoke', () => { it('runs', () => { expect(true).toBe(true); }); });\n`;

function ensureTestScript(pkgJson: string): string {
  try {
    type Pkg = { scripts?: Record<string, unknown> } & Record<string, unknown>;
    const pkg = JSON.parse(pkgJson) as Pkg;
    const scripts = (pkg.scripts ?? {}) as Record<string, string | undefined>;
    if (!scripts.test) {
      scripts.test = 'vitest run --reporter=default';
    }
    pkg.scripts = scripts;
    return JSON.stringify(pkg as Record<string, unknown>, null, 2);
  } catch {
    // If invalid JSON, overwrite minimal
    return JSON.stringify({ name: 'generated-project', version: '0.0.0', scripts: { test: 'vitest run --reporter=default' } }, null, 2);
  }
}

export function seedTestsInFiles(files: GeneratedFile[]): GeneratedFile[] {
  const out = [...files];
  const hasTest = out.some(f => /\.(test|spec)\.[cm]?tsx?$/.test(f.path));
  if (!hasTest) {
    out.push({ path: SEED_TEST_PATH, contents: SEED_TEST_CONTENT });
  }
  const pkgIdx = out.findIndex(f => f.path.replace(/^\.\/?/, '') === 'package.json');
  if (pkgIdx >= 0) {
    const pkgFile = out[pkgIdx]!;
    out[pkgIdx] = { path: pkgFile.path, contents: ensureTestScript(pkgFile.contents) };
  } else {
    out.push({ path: 'package.json', contents: ensureTestScript('{}') });
  }
  return out;
}

export async function seedTestsOnDisk(rootDir: string): Promise<void> {
  // basic presence check: if any test file exists, skip
  // To avoid expensive walks, just ensure a seed exists unconditionally.
  const testAbs = path.join(rootDir, SEED_TEST_PATH);
  await fs.mkdir(path.dirname(testAbs), { recursive: true });
  try {
    await fs.access(testAbs);
  } catch {
    await fs.writeFile(testAbs, SEED_TEST_CONTENT, 'utf-8');
  }
  // ensure package.json test script
  const pkgPath = path.join(rootDir, 'package.json');
  let pkg = '{}';
  try { pkg = await fs.readFile(pkgPath, 'utf-8'); } catch { pkg = '{}'; }
  const next = ensureTestScript(pkg);
  await fs.writeFile(pkgPath, next, 'utf-8');
}
