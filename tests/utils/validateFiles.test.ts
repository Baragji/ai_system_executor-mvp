import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateFilesNonEmpty } from '../../src/utils/validateFiles.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-files-'));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('validateFilesNonEmpty', () => {
  it('returns ok when all files exist and non-empty', async () => {
    const a = path.join(tmp, 'a.txt');
    await fs.writeFile(a, 'x', 'utf-8');
    const res = await validateFilesNonEmpty(tmp, ['a.txt']);
    expect(res.ok).toBe(true);
    expect(res.missing).toHaveLength(0);
    expect(res.empty).toHaveLength(0);
  });

  it('reports missing files', async () => {
    const res = await validateFilesNonEmpty(tmp, ['nope.txt']);
    expect(res.ok).toBe(false);
    expect(res.missing).toEqual(['nope.txt']);
    expect(res.empty).toHaveLength(0);
  });

  it('reports empty files', async () => {
    const b = path.join(tmp, 'b.txt');
    await fs.writeFile(b, '', 'utf-8');
    const res = await validateFilesNonEmpty(tmp, ['b.txt']);
    expect(res.ok).toBe(false);
    expect(res.missing).toHaveLength(0);
    expect(res.empty).toEqual(['b.txt']);
  });
});

