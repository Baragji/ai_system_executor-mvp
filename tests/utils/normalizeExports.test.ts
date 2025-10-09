import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { ensureDefaultExportForApp } from '../../src/utils/normalizeExports.js';

async function mkTmp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'normalize-exports-'));
  await fs.mkdir(path.join(dir, 'src'), { recursive: true });
  return dir;
}

describe('ensureDefaultExportForApp', () => {
  it('adds default export when only named app is exported (TS)', async () => {
    const root = await mkTmp();
    const appTs = `import express from 'express';\nexport const app = express();\n`; // no default export
    await fs.writeFile(path.join(root, 'src', 'app.ts'), appTs, 'utf-8');

    await ensureDefaultExportForApp(root);

    const next = await fs.readFile(path.join(root, 'src', 'app.ts'), 'utf-8');
    expect(next).toMatch(/export default app;/);
  });

  it('does nothing when default export already present', async () => {
    const root = await mkTmp();
    const appTs = `import express from 'express';\nexport const app = express();\nexport default app;\n`;
    await fs.writeFile(path.join(root, 'src', 'app.ts'), appTs, 'utf-8');

    await ensureDefaultExportForApp(root);

    const next = await fs.readFile(path.join(root, 'src', 'app.ts'), 'utf-8');
    const matches = next.match(/export default app;/g) || [];
    expect(matches.length).toBe(1);
  });
});

