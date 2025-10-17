import fs from "node:fs/promises";
import crypto from "node:crypto";

import {
  resolveProjectPath,
  scanWorkspace,
  summarizeWorkspace
} from "../../workspace/manifest.js";
import type { ToolDefinition, ToolExecutionContext } from "../types.js";

const DEFAULT_MAX_BYTES = 200_000;

function ensureProjectSlug(context: ToolExecutionContext): string {
  if (!context.projectSlug) {
    throw new Error("Filesystem tools require projectSlug in context");
  }
  return context.projectSlug;
}

function normalizeRelativePath(input: unknown): string {
  if (typeof input !== "string" || !input.trim()) {
    return ".";
  }
  return input.trim();
}

async function listDirectoryExecute(args: unknown, context: ToolExecutionContext) {
  const projectSlug = ensureProjectSlug(context);
  const rel = normalizeRelativePath((args as { path?: unknown })?.path);
  const absolute = resolveProjectPath(projectSlug, rel);
  const stats = await fs.stat(absolute);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${rel}`);
  }
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  return {
    path: rel,
    entries: entries
      .map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

async function readFileExecute(args: unknown, context: ToolExecutionContext) {
  const projectSlug = ensureProjectSlug(context);
  const { path: rawPath, maxBytes: rawMaxBytes } = (args as { path?: unknown; maxBytes?: unknown }) ?? {};
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    throw new Error("path is required");
  }
  const relPath = rawPath.trim();
  const absolute = resolveProjectPath(projectSlug, relPath);
  const stats = await fs.stat(absolute);
  if (!stats.isFile()) {
    throw new Error(`Not a file: ${relPath}`);
  }
  const maxBytes = typeof rawMaxBytes === "number" && Number.isFinite(rawMaxBytes) && rawMaxBytes > 0
    ? Math.floor(rawMaxBytes)
    : DEFAULT_MAX_BYTES;
  const content = await fs.readFile(absolute, "utf-8");
  const truncated = content.length > maxBytes ? content.slice(0, maxBytes) : content;
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
  return {
    path: relPath,
    size: stats.size,
    content: truncated,
    truncated: content.length > maxBytes,
    hash,
    modified: stats.mtime.toISOString()
  };
}

async function workspaceSummaryExecute(_args: unknown, context: ToolExecutionContext) {
  const projectSlug = ensureProjectSlug(context);
  const files = await scanWorkspace(projectSlug);
  const summary = summarizeWorkspace(files);
  return {
    project: projectSlug,
    totalFiles: summary.totalFiles,
    totalSize: summary.totalSize,
    topFiles: summary.topFiles,
    tree: summary.tree
  };
}

export const fsTools = {
  listDirectory: {
    name: "list_directory",
    description: "List entries within a workspace directory",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to the project root"
        }
      },
      required: ["path"],
      additionalProperties: false
    },
    execute: listDirectoryExecute
  } satisfies ToolDefinition,
  readFile: {
    name: "read_file",
    description: "Read a file from the workspace with optional truncation",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the project root"
        },
        maxBytes: {
          type: "integer",
          minimum: 1,
          description: "Maximum number of bytes to return"
        }
      },
      required: ["path"],
      additionalProperties: false
    },
    execute: readFileExecute
  } satisfies ToolDefinition,
  workspaceSummary: {
    name: "get_workspace_summary",
    description: "Return a summary of files within the workspace",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    },
    execute: workspaceSummaryExecute
  } satisfies ToolDefinition
};

export const DEFAULT_FS_TOOLS: ToolDefinition[] = [
  fsTools.listDirectory,
  fsTools.readFile,
  fsTools.workspaceSummary
];
