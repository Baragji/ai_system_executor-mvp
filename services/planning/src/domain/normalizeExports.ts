import fs from 'node:fs/promises';
import path from 'node:path';

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function needsDefaultExport(content: string): boolean {
  const hasDefault = /export\s+default\s+/m.test(content);
  if (hasDefault) return false;
  // Heuristics: common patterns that export a named `app`
  const exportsAppNamed = /export\s+const\s+app\b|export\s+let\s+app\b|export\s+\{[^}]*\bapp\b[^}]*\}/m.test(content);
  return exportsAppNamed;
}

export async function ensureDefaultExportForApp(rootDir: string): Promise<void> {
  const candidates = [
    path.join(rootDir, 'src', 'app.ts'),
    path.join(rootDir, 'src', 'app.js')
  ];

  for (const abs of candidates) {
    if (!(await fileExists(abs))) continue;
    try {
      const original = await fs.readFile(abs, 'utf-8');
      if (!needsDefaultExport(original)) continue;
      const next = original.trimEnd() + '\n\nexport default app;\n';
      await fs.writeFile(abs, next, 'utf-8');
      // Only patch the first matching file
      return;
    } catch {
      // Ignore any file-level error; continue to next candidate
    }
  }
}

