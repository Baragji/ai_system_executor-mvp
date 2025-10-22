import fs from "node:fs/promises";
import path from "node:path";
import type { ExecutorFile } from "./types.js";

function normalizeAndValidate(relPath: string, rootDir: string): string {
  // Decode URI encodings first (defense in depth)
  let decoded = relPath;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    // keep original if decoding fails
  }
  // Reject null bytes
  if (decoded.includes("\0")) {
    throw new Error(`Unsafe path (null byte) rejected: ${relPath}`);
  }
  // Normalize
  const normalized = path.normalize(decoded);
  // Absolute paths are never allowed
  if (path.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe absolute path rejected: ${relPath}`);
  }
  // Resolve under root and ensure containment
  const resolvedRoot = path.resolve(rootDir);
  const abspath = path.resolve(resolvedRoot, normalized);
  const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  if (!abspath.startsWith(prefix)) {
    throw new Error(`Path escapes project root: ${relPath}`);
  }
  return abspath;
}

export async function writeFiles(rootDir: string, files: ExecutorFile[]) {
  const resolvedRoot = path.resolve(rootDir);
  for (const f of files) {
    const abspath = normalizeAndValidate(f.path, resolvedRoot);
    await fs.mkdir(path.dirname(abspath), { recursive: true });
    await fs.writeFile(abspath, f.contents, { encoding: "utf-8" });
  }
}
