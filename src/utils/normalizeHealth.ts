import fs from 'node:fs/promises';
import path from 'node:path';

async function patchHealthInFile(absPath: string): Promise<boolean> {
  try {
    const src = await fs.readFile(absPath, 'utf-8');
    const before = src;
    // Replace common text-based health responses with JSON
    let next = src.replace(
      /(app\.get\(\s*['"])\/health(['"].*?\{)([\s\S]*?)(\})/g,
      (_m, p1, p2, body, p4) => {
        const fixedBody = body
          .replace(/res\.type\([^)]*\)\s*\.\s*send\([^)]*\)\s*;?/g, 'res.json({ status: "ok" });')
          .replace(/res\.send\([^)]*\)\s*;?/g, 'res.json({ status: "ok" });')
          .replace(/res\.end\([^)]*\)\s*;?/g, 'res.json({ status: "ok" });')
          .replace(/res\.status\(\s*200\s*\)\s*\.\s*send\([^)]*\)\s*;?/g, 'res.status(200).json({ status: "ok" });');
        return `${p1}/health${p2}${fixedBody}${p4}`;
      }
    );
    // Handle minimal inline forms: app.get('/health', (_req,res)=> res.send('ok'))
    next = next.replace(
      /(app\.get\(\s*['"])\/health(['"],\s*\([^)]*\)\s*=>\s*)(res\.status\(\s*200\s*\)\s*\.\s*)?res\.(end|send)\([^)]*\)/g,
      (_m, p1, p2) => `${p1}/health${p2}res.json({ status: "ok" })`
    );

    if (next !== before) {
      await fs.writeFile(absPath, next, 'utf-8');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function ensureJsonHealthOnDisk(rootDir: string): Promise<void> {
  const candidates = ['server.js', 'app.js', 'src/server.js', 'src/app.js'];
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    await patchHealthInFile(abs);
  }
}

