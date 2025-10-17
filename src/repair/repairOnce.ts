import fs from "node:fs/promises";
import path from "node:path";

// Orchestrates a single repair attempt using the sandbox runner and LLM output.

import { generateJSON, type LLMMessage } from "../llm/index.js";
import { throwIfAborted } from "../orchestrator/abortSignal.js";
import { runInSandbox } from "../runner/runInSandbox.js";
import {
  validateRepairArtifact,
  type RepairArtifactDescription,
  type RunResult
} from "../contracts/validators.js";
import type { ExecutorFile } from "../executor/types.js";

export interface RepairOnceArgs {
  projectRoot: string;
  projectSlug: string;
  failure: RunResult;
  originalFiles: ExecutorFile[];
  prompt: string;
  sessionId?: string;
}

export interface RepairOutcome {
  attempted: boolean;
  repaired: boolean;
  appliedFiles: number;
  artifacts: RepairArtifactDescription[];
  runResult?: RunResult;
  notes: string[];
  error?: string;
}

function buildRepairPrompt(args: RepairOnceArgs): LLMMessage[] {
  const { prompt, failure, originalFiles } = args;
  const systemPrompt = `You are an expert software repair assistant. You receive the original build prompt, the failing test summary, and the original files. Respond with strict JSON describing file updates to apply. JSON format: {"artifacts":[{"path":"string","action":"modify|add|delete","description":"string"}],"files":[{"path":"string","contents":"string"}],"notes":string[]}. When deleting a file include the artifact with action="delete" and omit it from files.`;

  const failingSummary = `Status: ${failure.status}\nPass Count: ${failure.passCount}\nFail Count: ${failure.failCount}\nDuration: ${failure.durationMs}ms\nLogs Path: ${failure.logsPath}`;

  const fileSnippets = originalFiles
    .map(file => `--- ${file.path} ---\n${file.contents}`)
    .join("\n\n");

  const userPrompt = `Original prompt:\n${prompt}\n\nFailing test summary:\n${failingSummary}\n\nFailure logs (truncated):\n${failure.errorMessage ?? "See logs file"}\n\nCurrent files:\n${fileSnippets}`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
}

function ensureInsideProject(projectRoot: string, candidate: string): string {
  const resolved = path.resolve(projectRoot, candidate);
  if (!resolved.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Path escapes project root: ${candidate}`);
  }
  return resolved;
}

async function applyArtifacts(
  projectRoot: string,
  artifacts: RepairArtifactDescription[],
  files: ExecutorFile[]
): Promise<number> {
  let applied = 0;
  const fileMap = new Map(files.map(file => [file.path, file.contents] as const));

  for (const artifact of artifacts) {
    const targetPath = ensureInsideProject(projectRoot, artifact.path);
    if (artifact.action === "delete") {
      try {
        await fs.rm(targetPath, { force: true });
        applied += 1;
      } catch (err) {
        throw new Error(`Failed to delete ${artifact.path}: ${(err as Error).message}`);
      }
      continue;
    }

    const contents = fileMap.get(artifact.path);
    if (typeof contents !== "string") {
      throw new Error(`Missing contents for ${artifact.path}`);
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, contents, "utf-8");
    applied += 1;
  }

  return applied;
}

function validateArtifacts(rawArtifacts: unknown[]): RepairArtifactDescription[] {
  const artifacts: RepairArtifactDescription[] = [];
  for (const entry of rawArtifacts) {
    const validation = validateRepairArtifact(entry);
    if (!validation.ok) {
      throw new Error(`Invalid repair artifact: ${validation.errors}`);
    }
    artifacts.push(validation.value);
  }
  return artifacts;
}

export async function repairOnce(args: RepairOnceArgs): Promise<RepairOutcome> {
  const { sessionId } = args;
  const notes: string[] = [];
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    notes.push("NO_LLM");
    return {
      attempted: true,
      repaired: false,
      appliedFiles: 0,
      artifacts: [],
      notes,
      error: "LLM credentials missing"
    };
  }

  let raw: string;
  try {
    throwIfAborted(sessionId, "repair_once_llm");
    raw = await generateJSON(buildRepairPrompt(args), { sessionId });
    if (sessionId) {
      throwIfAborted(sessionId, "post_repair_once_llm");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      attempted: true,
      repaired: false,
      appliedFiles: 0,
      artifacts: [],
      notes,
      error: message
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      attempted: true,
      repaired: false,
      appliedFiles: 0,
      artifacts: [],
      notes,
      error: `Repair LLM returned invalid JSON: ${(err as Error).message}`
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      attempted: true,
      repaired: false,
      appliedFiles: 0,
      artifacts: [],
      notes,
      error: "Repair payload was not an object"
    };
  }

  const parsedObject = parsed as Record<string, unknown>;
  const artifactList = Array.isArray(parsedObject.artifacts) ? parsedObject.artifacts : [];
  const filesList = Array.isArray(parsedObject.files) ? parsedObject.files : [];
  const notesFromModel: string[] = Array.isArray(parsedObject.notes)
    ? parsedObject.notes.filter((n): n is string => typeof n === "string")
    : [];
  notes.push(...notesFromModel);

  let artifacts: RepairArtifactDescription[];
  try {
    artifacts = validateArtifacts(artifactList);
  } catch (err) {
    return {
      attempted: true,
      repaired: false,
      appliedFiles: 0,
      artifacts: [],
      notes,
      error: (err as Error).message
    };
  }

  const fileSet: ExecutorFile[] = filesList
    .filter((f: unknown): f is ExecutorFile => {
      if (typeof f !== "object" || f === null) return false;
      const candidate = f as Record<string, unknown>;
      return typeof candidate.path === "string" && typeof candidate.contents === "string";
    })
    .map(f => ({ path: f.path, contents: f.contents }));

  let appliedFiles = 0;
  try {
    appliedFiles = await applyArtifacts(args.projectRoot, artifacts, fileSet);
  } catch (err) {
    return {
      attempted: true,
      repaired: false,
      appliedFiles,
      artifacts,
      notes,
      error: (err as Error).message
    };
  }

  let runResult: RunResult | undefined;
  try {
    runResult = await runInSandbox({
      projectRoot: args.projectRoot,
      projectSlug: args.projectSlug
    });
  } catch (err) {
    return {
      attempted: true,
      repaired: false,
      appliedFiles,
      artifacts,
      notes,
      error: `Failed to run tests after repair: ${(err as Error).message}`
    };
  }

  const repaired = runResult.status === "pass";
  return {
    attempted: true,
    repaired,
    appliedFiles,
    artifacts,
    runResult,
    notes
  };
}
