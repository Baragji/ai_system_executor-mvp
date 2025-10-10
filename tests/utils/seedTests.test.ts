import { describe, it, expect } from 'vitest';
import { seedTestsInFiles } from '../../src/utils/seedTests.js';
import type { GeneratedFile } from '../../src/utils/seedTests.js';

describe('seedTestsInFiles', () => {
  it('adds a smoke test and package.json when missing', () => {
    const out = seedTestsInFiles([]);
    const hasAnyTest = out.some(f => /tests\/smoke\.(spec|test)\.(t|j)sx?$/.test(f.path));
    const hasPkg = out.some(f => f.path.replace(/^\.\/?/, '') === 'package.json');
    expect(hasAnyTest).toBe(true);
    expect(hasPkg).toBe(true);
  });

  it('keeps existing package.json but ensures test script', () => {
    const start: GeneratedFile[] = [{ path: 'package.json', contents: '{"name":"x"}' }];
    const out = seedTestsInFiles(start);
    const pkg = out.find(f => f.path === 'package.json')!;
    const parsed = JSON.parse(pkg.contents);
    expect(parsed.scripts.test).toBeTypeOf('string');
  });
});
