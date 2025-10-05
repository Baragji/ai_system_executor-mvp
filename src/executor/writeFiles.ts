import fs from "node:fs/promises";
import path from "node:path";
import type { ExecutorFile } from "./types.js";

function isSafeRelative(p: string) {
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p)) return false;
  if (p.includes("..") || p.includes("\\") || p.includes('"')) return false;
  return true;
}

export async function writeFiles(rootDir: string, files: ExecutorFile[]) {
  for (const f of files) {
    if (!isSafeRelative(f.path)) {
      throw new Error(`Unsafe path rejected: ${f.path}`);
    }
    const abspath = path.join(rootDir, f.path);
    await fs.mkdir(path.dirname(abspath), { recursive: true });
    await fs.writeFile(abspath, f.contents, { encoding: "utf-8" });
  }
}
