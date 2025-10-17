import fs from 'node:fs/promises';
import path from 'node:path';

export interface FileValidation {
  ok: boolean;
  missing: string[];
  empty: string[];
}

export async function validateFilesNonEmpty(rootDir: string, relativePaths: string[]): Promise<FileValidation> {
  const unique = Array.from(new Set(relativePaths.filter(Boolean)));
  const missing: string[] = [];
  const empty: string[] = [];
  for (const rel of unique) {
    const absolute = path.resolve(rootDir, rel);
    try {
      const st = await fs.stat(absolute);
      if (!st.isFile() || st.size <= 0) {
        empty.push(rel);
      }
    } catch {
      missing.push(rel);
    }
  }
  return { ok: missing.length === 0 && empty.length === 0, missing, empty };
}

