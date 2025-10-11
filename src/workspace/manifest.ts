import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface WorkspaceFileEntry {
  path: string;
  size: number;
  hash: string;
  modified: string;
}

export interface WorkspaceSummary {
  totalFiles: number;
  totalSize: number;
  topFiles: WorkspaceFileEntry[];
  tree: Record<string, unknown>;
}

const OUTPUT_ROOT = path.resolve(process.cwd(), "output");

function assertValidProjectSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new Error("projectSlug is required");
  }
  if (trimmed.includes("..") || /[\\/]/.test(trimmed)) {
    throw new Error("projectSlug contains invalid path segments");
  }
  return trimmed;
}

export function resolveProjectRoot(projectSlug: string): string {
  const safeSlug = assertValidProjectSlug(projectSlug);
  const root = path.resolve(OUTPUT_ROOT, safeSlug);
  if (root !== OUTPUT_ROOT && !root.startsWith(OUTPUT_ROOT + path.sep)) {
    throw new Error("Resolved project path escaped output directory");
  }
  return root;
}

export function resolveProjectPath(projectSlug: string, relativePath = "."): string {
  const projectRoot = resolveProjectRoot(projectSlug);
  const target = path.resolve(projectRoot, relativePath);
  if (target !== projectRoot && !target.startsWith(projectRoot + path.sep)) {
    throw new Error("Path outside project workspace");
  }
  return target;
}

interface ErrnoLike extends Error {
  code?: string;
}

function isErrnoLike(error: unknown): error is ErrnoLike {
  return Boolean(error) && typeof error === "object" && "code" in (error as Record<string, unknown>);
}

export async function scanWorkspace(projectSlug: string): Promise<WorkspaceFileEntry[]> {
  const root = resolveProjectRoot(projectSlug);
  let stats;
  try {
    stats = await fs.stat(root);
  } catch (error) {
    if (isErrnoLike(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  if (!stats.isDirectory()) {
    return [];
  }

  const files: WorkspaceFileEntry[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stat = await fs.stat(absolute);
      const data = await fs.readFile(absolute);
      const hash = crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      files.push({
        path: relative,
        size: stat.size,
        hash,
        modified: stat.mtime.toISOString()
      });
    }
  }

  await walk(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

export function summarizeWorkspace(files: WorkspaceFileEntry[], topN = 20): WorkspaceSummary {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const topFiles = [...files].sort((a, b) => b.size - a.size).slice(0, topN);
  return {
    totalFiles: files.length,
    totalSize,
    topFiles,
    tree: buildWorkspaceTree(files)
  };
}

export function buildWorkspaceTree(files: WorkspaceFileEntry[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const file of files) {
    const parts = file.path.split("/");
    let node: Record<string, unknown> = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i] ?? "";
      if (!part) continue;
      if (!node[part]) {
        node[part] = {};
      }
      node = node[part] as Record<string, unknown>;
    }
    const leaf = parts[parts.length - 1];
    if (!leaf) continue;
    node[leaf] = { size: file.size, hash: file.hash };
  }
  return root;
}

export { OUTPUT_ROOT };
