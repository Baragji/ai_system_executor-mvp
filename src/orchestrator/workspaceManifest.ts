import fs from "node:fs/promises";
import path from "node:path";

import {
  resolveProjectRoot,
  scanWorkspace,
  summarizeWorkspace,
  type WorkspaceFileEntry,
  type WorkspaceSummary
} from "../workspace/manifest.js";

const MANIFESTS_DIR = path.resolve(process.cwd(), ".automation", "manifests");

interface ErrnoLike extends Error {
  code?: string;
}

function isErrnoLike(value: unknown): value is ErrnoLike {
  return Boolean(value) && typeof value === "object" && "code" in (value as Record<string, unknown>);
}

export interface WorkspaceManifest {
  sessionId: string;
  projectSlug: string;
  capturedAt: string;
  files: WorkspaceFileEntry[];
  summary: WorkspaceSummary;
}

function sanitizeSessionId(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    throw new Error("sessionId is required for manifest operations");
  }
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!safe) {
    throw new Error("sessionId contained no usable characters after sanitization");
  }
  return safe;
}

export async function captureManifest(sessionId: string, projectSlug: string): Promise<WorkspaceManifest> {
  resolveProjectRoot(projectSlug); // validates slug without forcing directory creation
  const files = await scanWorkspace(projectSlug);
  const manifest: WorkspaceManifest = {
    sessionId,
    projectSlug,
    capturedAt: new Date().toISOString(),
    files,
    summary: summarizeWorkspace(files)
  };

  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  const filename = `${sanitizeSessionId(sessionId)}.json`;
  const temp = path.join(MANIFESTS_DIR, `${filename}.tmp-${process.pid}-${Date.now()}`);
  await fs.writeFile(temp, JSON.stringify(manifest, null, 2), "utf-8");
  await fs.rename(temp, path.join(MANIFESTS_DIR, filename));

  return manifest;
}

export async function getManifest(sessionId: string): Promise<WorkspaceManifest | null> {
  const filename = `${sanitizeSessionId(sessionId)}.json`;
  try {
    const raw = await fs.readFile(path.join(MANIFESTS_DIR, filename), "utf-8");
    return JSON.parse(raw) as WorkspaceManifest;
  } catch (error) {
    if (isErrnoLike(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
