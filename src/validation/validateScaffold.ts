export type GeneratedFile = { path: string; contents: string };
export type ValidationResult = { valid: true } | { valid: false; errors: string[]; missingFiles: string[] };

function safeJsonParse(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function validateScaffold(files: GeneratedFile[]): ValidationResult {
  const errors: string[] = [];
  const missing: string[] = [];
  const pkg = files.find(f => f.path.replace(/^\.\/?/, '') === 'package.json');
  if (!pkg) {
    missing.push('package.json');
    errors.push('package.json is missing');
    return { valid: false, errors, missingFiles: missing };
  }
  const parsed = safeJsonParse(pkg.contents);
  if (!parsed.ok) {
    errors.push(`package.json is not valid JSON: ${parsed.error}`);
    return { valid: false, errors, missingFiles: [] };
  }
  const obj = parsed.value as Record<string, unknown>;
  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    errors.push('package.json.name is required');
  }
  if (typeof obj.version !== 'string' || obj.version.length === 0) {
    errors.push('package.json.version is required');
  }
  if (typeof obj.scripts !== 'object' || obj.scripts === null) {
    errors.push('package.json.scripts is required');
  }
  if (errors.length) return { valid: false, errors, missingFiles: [] };
  return { valid: true };
}

// Optional helper for runtime validation against on-disk scaffold
import fs from 'node:fs/promises';
import path from 'node:path';

export async function validateScaffoldOnDisk(projectRoot: string): Promise<ValidationResult> {
  const pkgPath = path.join(projectRoot, 'package.json');
  try {
    const contents = await fs.readFile(pkgPath, 'utf-8');
    return validateScaffold([{ path: 'package.json', contents }]);
  } catch {
    return { valid: false, errors: ['package.json missing or unreadable'], missingFiles: ['package.json'] };
  }
}
