import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFixture, listFixtures, readFixture, FIXTURES_ROOT } from '../../src/fixtures/index.js';

describe('fixtures utility', () => {
  it('writes and lists fixtures per session', async () => {
    const slug = `proj-${Date.now()}`;
    const sessionId = 'session-1';
    const rel = path.join('subtasks', 'x', 'prompt.json');
    await writeFixture(slug, sessionId, rel, { hello: 'world' });
    const list = await listFixtures(slug);
    expect(Object.keys(list)).toContain(sessionId);
    expect(list[sessionId].some(f => f.endsWith('prompt.json'))).toBe(true);
    const data = await readFixture<{ hello: string }>(slug, sessionId, rel);
    expect(data.hello).toBe('world');
    // Cleanup
    await fs.rm(path.join(FIXTURES_ROOT, slug), { recursive: true, force: true });
  });
});
