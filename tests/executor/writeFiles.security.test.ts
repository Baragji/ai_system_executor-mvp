import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { writeFiles } from '../../src/executor/writeFiles.js';

const tempDirs: string[] = [];
afterEach(async () => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

async function mkRoot(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wf-sec-'));
  tempDirs.push(dir);
  return dir;
}

describe('writeFiles security', () => {
  it('rejects absolute paths', async () => {
    const root = await mkRoot();
    await expect(
      writeFiles(root, [{ path: '/etc/passwd', contents: 'x' }])
    ).rejects.toThrow(/absolute path/i);
  });

  it('rejects encoded traversal', async () => {
    const root = await mkRoot();
    await expect(
      writeFiles(root, [{ path: '%2e%2e/evil.txt', contents: 'x' }])
    ).rejects.toThrow(/escapes project root/i);
  });

  it('rejects null bytes', async () => {
    const root = await mkRoot();
    await expect(
      writeFiles(root, [{ path: 'a%00b.txt', contents: 'x' }])
    ).rejects.toThrow(/null byte/i);
  });

  it('allows safe relative path', async () => {
    const root = await mkRoot();
    await writeFiles(root, [{ path: 'safe/ok.txt', contents: 'hello' }]);
    const content = await fs.readFile(path.join(root, 'safe', 'ok.txt'), 'utf-8');
    expect(content).toBe('hello');
  });
});
