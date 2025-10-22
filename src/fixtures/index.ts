import fs from 'node:fs/promises';
import path from 'node:path';

const FIXTURES_ROOT = path.resolve('.automation', 'fixtures');

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeFixture(slug: string, sessionId: string, relPath: string, data: unknown): Promise<string> {
  const base = path.join(FIXTURES_ROOT, slug, sessionId);
  const abs = path.join(base, relPath);
  await ensureDir(path.dirname(abs));
  await fs.writeFile(abs, JSON.stringify(data, null, 2), 'utf-8');
  return abs;
}

export async function listFixtures(slug: string): Promise<Record<string, string[]>> {
  const projectRoot = path.join(FIXTURES_ROOT, slug);
  const result: Record<string, string[]> = {};
  try {
    const sessions = await fs.readdir(projectRoot);
    for (const session of sessions) {
      const sessionDir = path.join(projectRoot, session);
      try {
        const files = await walkFiles(sessionDir);
        result[session] = files.map(f => path.relative(sessionDir, f));
      } catch {
        result[session] = [];
      }
    }
  } catch {
    // no fixtures yet
  }
  return result;
}

export async function readFixture<T = unknown>(slug: string, sessionId: string, relPath: string): Promise<T> {
  const abs = path.join(FIXTURES_ROOT, slug, sessionId, relPath);
  const content = await fs.readFile(abs, 'utf-8');
  return JSON.parse(content) as T;
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        out.push(abs);
      }
    }
  }
  await walk(root);
  return out;
}

export { FIXTURES_ROOT };

