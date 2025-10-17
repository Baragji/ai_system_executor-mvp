import path from 'node:path';
import fs from 'node:fs/promises';

export type GeneratedFile = { path: string; contents: string };

type Pkg = {
  scripts?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
  dependencies?: Record<string, string | undefined>;
} & Record<string, unknown>;

function parsePkg(json: string): Pkg {
  try { return JSON.parse(json) as Pkg; } catch { return {}; }
}

function detectRunner(pkg: Pkg): 'jest' | 'vitest' | 'node' {
  const testScript = pkg.scripts?.test || '';
  const has = (name: string) => Boolean(pkg.devDependencies?.[name] || pkg.dependencies?.[name]);
  if (/jest/i.test(testScript) || has('jest')) return 'jest';
  if (/vitest/i.test(testScript) || has('vitest')) return 'vitest';
  if (/node\s+--test/i.test(testScript)) return 'node';
  return 'node';
}

function seedContentFor(runner: 'jest' | 'vitest' | 'node'): { path: string; contents: string } {
  if (runner === 'vitest') {
    return {
      path: 'tests/smoke.spec.ts',
      contents: `import { describe, it, expect } from 'vitest';\n	describe('smoke', () => { it('runs', () => { expect(true).toBe(true); }); });\n`
    };
  }
  if (runner === 'jest') {
    return {
      path: 'tests/smoke.test.js',
      contents: `test('smoke', () => { expect(true).toBe(true); });\n`
    };
  }
  return {
    path: 'tests/smoke.test.js',
    contents: `const test = require('node:test');\nconst assert = require('node:assert');\n\ntest('smoke', () => { assert.ok(true); });\n`
  };
}

function canSeedHealth(files: GeneratedFile[], pkg: Pkg): boolean {
  const hasServer = files.some(f => /(^|\/)server\.js$/.test(f.path) || /(^|\/)app\.js$/.test(f.path));
  const hasSupertest = Boolean(pkg.devDependencies?.supertest || pkg.dependencies?.supertest);
  return hasServer && hasSupertest;
}

function healthTestForJest(): { path: string; contents: string } {
  return {
    path: 'tests/health.test.js',
    contents: `const request = require('supertest');\nconst app = require('../server');\n\ndescribe('Health endpoint', () => {\n  it('GET /health returns 200 and JSON', async () => {\n    const res = await request(app).get('/health');\n    expect(res.status).toBe(200);\n    expect(res.headers['content-type']).toMatch(/json/);\n    expect(res.body).toEqual({ status: 'ok' });\n  });\n});\n`
  };
}

function ensureTestScript(pkgJson: string): string {
  const pkg = parsePkg(pkgJson);
  const scripts = (pkg.scripts ?? {}) as Record<string, string | undefined>;
  if (!scripts.test) {
    const runner = detectRunner(pkg);
    scripts.test = runner === 'jest'
      ? 'jest --runInBand'
      : runner === 'vitest'
      ? 'vitest run --reporter=default'
      : 'node --test';
  }
  pkg.scripts = scripts;
  return JSON.stringify(pkg as Record<string, unknown>, null, 2);
}

export function seedTestsInFiles(files: GeneratedFile[]): GeneratedFile[] {
  const out = [...files];
  const pkgIdx = out.findIndex(f => f.path.replace(/^\.\/?/, '') === 'package.json');
  const pkgJson = pkgIdx >= 0 ? out[pkgIdx]!.contents : '{}';
  const pkg = parsePkg(pkgJson);
  const runner = detectRunner(pkg);
  const hasTest = out.some(f => /\.(test|spec)\.[cm]?tsx?$/.test(f.path));
  if (!hasTest) {
    out.push(seedContentFor(runner));
  }
  // Add a runner-appropriate health test if we can and none present
  const hasHealth = out.some(f => /tests\/(health|server)\.test\.js$/.test(f.path));
  if (!hasHealth && runner === 'jest' && canSeedHealth(out, pkg)) {
    out.push(healthTestForJest());
  }
  if (pkgIdx >= 0) {
    const pkgFile = out[pkgIdx]!;
    out[pkgIdx] = { path: pkgFile.path, contents: ensureTestScript(pkgFile.contents) };
  } else {
    out.push({ path: 'package.json', contents: ensureTestScript('{}') });
  }
  return out;
}

export async function seedTestsOnDisk(rootDir: string): Promise<void> {
  // Detect runner from existing package.json (if any)
  const pkgPath = path.join(rootDir, 'package.json');
  let pkgJson = '{}';
  try { pkgJson = await fs.readFile(pkgPath, 'utf-8'); } catch { /* ignore */ }
  const runner = detectRunner(parsePkg(pkgJson));

  // If no tests present, write a seed for the detected runner
  const seed = seedContentFor(runner);
  const testAbs = path.join(rootDir, seed.path);
  await fs.mkdir(path.dirname(testAbs), { recursive: true });
  try { await fs.access(testAbs); } catch { await fs.writeFile(testAbs, seed.contents, 'utf-8'); }

  // Ensure test script exists but do not overwrite when present
  const next = ensureTestScript(pkgJson);
  await fs.writeFile(pkgPath, next, 'utf-8');

  // Optionally seed a health test for Jest projects with supertest
  if (runner === 'jest') {
    try {
      const pkg = parsePkg(pkgJson);
      const hasSupertest = Boolean(pkg.devDependencies?.supertest || pkg.dependencies?.supertest);
      const serverCandidates = ['server.js', 'app.js'];
      const hasServer = await Promise.any(serverCandidates.map(async rel => {
        try { await fs.access(path.join(rootDir, rel)); return true; } catch { return false; }
      })).catch(() => false);
      const healthAbs = path.join(rootDir, 'tests', 'health.test.js');
      if (hasSupertest && hasServer) {
        try { await fs.access(healthAbs); } catch { await fs.writeFile(healthAbs, healthTestForJest().contents, 'utf-8'); }
      }
    } catch { /* ignore */ }
  }
}

export async function normalizeSeededTestsOnDisk(rootDir: string): Promise<void> {
  // Remove incompatible seed files if runner is not Vitest
  const pkgPath = path.join(rootDir, 'package.json');
  let pkgJson = '{}';
  try { pkgJson = await fs.readFile(pkgPath, 'utf-8'); } catch { /* ignore */ }
  const runner = detectRunner(parsePkg(pkgJson));
  if (runner !== 'vitest') {
    // Remove Vitest seed that can break Jest/Node
    const vitestSeed = path.join(rootDir, 'tests', 'smoke.spec.ts');
    try { await fs.rm(vitestSeed, { force: true }); } catch { /* ignore */ }
  }
}
