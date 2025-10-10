import fs from "node:fs/promises";
import path from "node:path";

import { generateJSON, type LLMMessage } from "../llm/index.js";
import { withTraceContext } from "../llm/trace.js";
import { runInSandbox } from "../runner/runInSandbox.js";
import { analyzeFailure } from "./analyzeFailure.js";
import {
  buildRepairPrompt,
  type PreviousAttemptSummary
} from "./buildRepairPrompt.js";
import { selectStrategy } from "./strategySelector.js";
import { generateDiff } from "./generateDiff.js";
import {
  validateRepairHistory,
  type FailureAnalysis,
  type RepairAttemptRecord,
  type RepairHistory
} from "../contracts/repairHistoryValidator.js";
import {
  validateRepairArtifact,
  type RepairArtifactDescription,
  type RunResult
} from "../contracts/validators.js";
import Ajv2020, { type JSONSchemaType } from "ajv/dist/2020.js";
import { logEvent } from "../telemetry/events.js";
import type { ExecutorFile } from "../executor/types.js";

export interface MultiTurnContext {
  projectPath: string;
  projectSlug?: string;
  originalPrompt: string;
  generatedFiles: string[];
  initialTestResult: RunResult;
  sessionId?: string;
}

interface ParsedRepairPayload {
  artifacts: RepairArtifactDescription[];
  files: ExecutorFile[];
  notes: string[];
}

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

async function readFailureLog(projectRoot: string, runResult: RunResult | undefined): Promise<string> {
  if (!runResult?.logsPath) {
    return "";
  }

  const absolute = path.resolve(projectRoot, runResult.logsPath);
  return readFileSafe(absolute);
}

function buildSystemPrompt(): string {
  return [
    "You are an expert software repair assistant.",
    "You receive a detailed summary of the current failures, what has already been tried, and the original project brief.",
    "Respond STRICTLY with JSON in the format {\"artifacts\":[],\"files\":[],\"notes\":[]}.",
    "artifacts entries describe high-level changes ({path, action}).",
    "files entries contain the complete file contents after modifications (for deletes, omit the file entry).",
    "Keep fixes minimal and directly address the failing tests."
  ].join(" ");
}

async function gatherFileContext(projectRoot: string, filePaths: string[]): Promise<string> {
  const segments: string[] = [];
  for (const relativePath of filePaths) {
    const absolute = path.resolve(projectRoot, relativePath);
    const contents = await readFileSafe(absolute);
    segments.push(`--- ${relativePath} ---\n${contents}`);
  }
  return segments.join("\n\n");
}

function ensureInsideProject(projectRoot: string, candidate: string): string {
  const resolved = path.resolve(projectRoot, candidate);
  if (!resolved.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Path escapes project root: ${candidate}`);
  }
  return resolved;
}

function parseArtifacts(rawArtifacts: unknown[]): RepairArtifactDescription[] {
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

async function capturePreviousContents(
  projectRoot: string,
  artifacts: RepairArtifactDescription[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const artifact of artifacts) {
    if (artifact.action === "delete") continue;
    const absolute = path.resolve(projectRoot, artifact.path);
    const before = await readFileSafe(absolute);
    map.set(artifact.path, before);
  }
  return map;
}

function parseRepairPayload(raw: unknown): ParsedRepairPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Repair payload must be an object");
  }

  const obj = raw as Record<string, unknown>;
  const artifactsRaw = Array.isArray(obj.artifacts) ? obj.artifacts : [];
  const filesRaw = Array.isArray(obj.files) ? obj.files : [];
  const notesRaw = Array.isArray(obj.notes) ? obj.notes : [];

  const files: ExecutorFile[] = filesRaw
    .filter((item): item is { path: string; contents: string } => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.path === "string" && typeof candidate.contents === "string";
    })
    .map(item => ({ path: item.path, contents: item.contents }));

  const artifacts = parseArtifacts(artifactsRaw);
  const notes = notesRaw.filter((note): note is string => typeof note === "string");

  return { artifacts, files, notes };
}

async function applyArtifacts(
  projectRoot: string,
  artifacts: RepairArtifactDescription[],
  files: ExecutorFile[]
): Promise<{ changed: string[] }> {
  const changes: string[] = [];
  const fileMap = new Map(files.map(file => [file.path, file.contents] as const));

  for (const artifact of artifacts) {
    const targetPath = ensureInsideProject(projectRoot, artifact.path);
    if (artifact.action === "delete") {
      // Enforce: delete only if the path exists on disk
      try {
        await fs.access(targetPath);
      } catch {
        throw new Error(`Invalid delete: path does not exist on disk (${artifact.path})`);
      }
      await fs.rm(targetPath, { force: true });
      changes.push(artifact.path);
      continue;
    }

    const contents = fileMap.get(artifact.path);
    if (typeof contents !== "string") {
      // Defer strict error to caller so they can choose a fallback strategy
      throw new Error(`Missing contents for ${artifact.path}`);
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, contents, "utf-8");
    changes.push(artifact.path);
  }

  return { changed: Array.from(new Set(changes)) };
}

function mapRunResult(run: RunResult): RepairAttemptRecord["testResult"] {
  return {
    status: run.status,
    passCount: run.passCount,
    failCount: run.failCount,
    durationMs: run.durationMs,
    logsPath: run.logsPath,
    summary: run.errorMessage,
    errorMessage: run.errorMessage
  };
}

function buildAttemptSummary(
  attemptNumber: number,
  status: "pass" | "fail" | "error",
  diffSummaries: string[],
  failureAnalysis: FailureAnalysis | null,
  errorDetails?: string
): string {
  if (status === "pass") {
    return diffSummaries.length > 0
      ? `Attempt ${attemptNumber}: tests passed after updates to ${diffSummaries.join(", ")}`
      : `Attempt ${attemptNumber}: tests passed without file changes.`;
  }

  const failureInfo = failureAnalysis
    ? `Remaining failure category: ${failureAnalysis.category}`
    : "Failure details unavailable";

  if (status === "fail") {
    return diffSummaries.length > 0
      ? `Attempt ${attemptNumber} failed after updating ${diffSummaries.join(", ")}. ${failureInfo}`
      : `Attempt ${attemptNumber} failed without file changes. ${failureInfo}`;
  }

  const detail = errorDetails ? ` Error: ${errorDetails}` : "";
  return `Attempt ${attemptNumber} encountered an error before tests could pass.${detail}`;
}

async function recordDiffs(
  projectRoot: string,
  artifacts: RepairArtifactDescription[],
  files: ExecutorFile[],
  changed: string[],
  previousContents: Map<string, string>
): Promise<string[]> {
  const summaries: string[] = [];
  const fileMap = new Map(files.map(file => [file.path, file.contents] as const));

  for (const artifact of artifacts) {
    if (!changed.includes(artifact.path)) continue;

    if (artifact.action === "delete") {
      summaries.push(`${artifact.path} (deleted)`);
      continue;
    }

    const before = previousContents.get(artifact.path) ?? "";
    const after = fileMap.get(artifact.path) ?? "";
    const diff = generateDiff(before, after, artifact.path);
    const magnitude = diff.isMinor ? "minor" : "major";
    summaries.push(`${artifact.path} (+${diff.linesAdded}/-${diff.linesRemoved}, ${magnitude})`);
  }

  return summaries;
}

  function validateHistory(history: RepairHistory): RepairHistory {
  const validation = validateRepairHistory(history);
  if (!validation.ok) {
    throw new Error(`Generated repair history invalid: ${validation.errors}`);
  }
  return validation.value;
}

function toAttemptNumber(index: number): 1 | 2 | 3 | 4 {
  switch (index) {
    case 0:
      return 1;
    case 1:
      return 2;
    case 2:
      return 3;
    default:
      return 4;
  }
}

export async function multiTurnRepair(context: MultiTurnContext): Promise<RepairHistory> {
  if (context.initialTestResult.status === "pass") {
    const startedAt = context.initialTestResult.startedAt ?? new Date().toISOString();
    const finishedAt = context.initialTestResult.finishedAt ?? startedAt;
    const durationMs = context.initialTestResult.durationMs;
    const attemptRecord: RepairAttemptRecord = {
      number: 1,
      status: "pass",
      startedAt,
      finishedAt,
      changedFiles: [],
      summary: "Initial test run passed - no repair needed.",
      testResult: mapRunResult(context.initialTestResult),
      durationMs,
      cumulativeTime: durationMs
    };

    return validateHistory({
      attempts: [attemptRecord],
      finalStatus: "pass",
      totalAttempts: 1,
      successAttemptNumber: 1
    });
  }

  const attempts: RepairAttemptRecord[] = [];
  const previousSummaries: PreviousAttemptSummary[] = [];
  const knownFiles = new Set(context.generatedFiles);
  let cumulativeTime = 0;
  let successAttemptNumber: number | undefined;
  let finalStatus: "pass" | "fail" | "exhausted" = "fail";

  let currentRun: RunResult = context.initialTestResult;
  const initialLog = await readFailureLog(context.projectPath, currentRun);
  let currentFailureAnalysis: FailureAnalysis | null =
    currentRun.status === "pass" ? null : analyzeFailure(initialLog);
  // Note: Deprecated health/test quick patch removed — generator is source of truth.
  for (let index = 0; index < 4; index += 1) {
    const attemptNumber = toAttemptNumber(index);
    const attemptStart = Date.now();
    const startedAtIso = new Date(attemptStart).toISOString();
    const fileContextPaths = Array.from(knownFiles).sort();
    const fileContext = await gatherFileContext(context.projectPath, fileContextPaths);
    const selectedStrategy = currentFailureAnalysis
      ? selectStrategy(currentFailureAnalysis.category, attemptNumber)
      : null;

    const prompt = buildRepairPrompt({
      attemptNumber,
      failureAnalysis: currentFailureAnalysis,
      previousAttempts: previousSummaries,
      originalPrompt: context.originalPrompt,
      maxAttempts: 4,
      strategyOverride: selectedStrategy
    });

    const messages: LLMMessage[] = [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: [
          prompt,
          fileContext ? `\n\nCurrent files:\n${fileContext}` : ""
        ]
          .filter(Boolean)
          .join("")
      }
    ];

    let attemptStatus: "pass" | "fail" | "error" = "fail";
    let runResult: RunResult | undefined;
    let failureAnalysis: FailureAnalysis | null = currentFailureAnalysis;
    let diffSummaries: string[] = [];
    let changedFiles: string[] = [];
    let summary: string;

    let lastErrorMessage: string | undefined;
    try {
      async function requestPayload(withRetryHint: boolean): Promise<ParsedRepairPayload> {
        const raw = await withTraceContext({ projectSlug: context.projectSlug, sessionId: context.sessionId, phase: 'repair' }, async () => generateJSON(
          withRetryHint
            ? ([
                messages[0]!,
                {
                  role: "user" as const,
                  content:
                    String(messages[1]?.content ?? "") +
                    "\n\nIMPORTANT: For every artifact with action add/modify, include the full final file contents in files[]. If you cannot provide contents, omit that artifact."
                }
              ] satisfies LLMMessage[])
            : (messages as LLMMessage[])
        ));
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          throw new Error(`Repair LLM returned invalid JSON: ${(err as Error).message}`);
        }
        return parseRepairPayload(parsed);
      }

      // First attempt to parse/apply
      let payload = await requestPayload(false);
      const previousContents = await capturePreviousContents(context.projectPath, payload.artifacts);
      let applyResult: { changed: string[] };
      try {
        applyResult = await applyArtifacts(context.projectPath, payload.artifacts, payload.files);
      } catch (applyErr) {
        const msg = (applyErr as Error).message || "";
        if (msg.includes("Missing contents for ")) {
          // One-time retry with stricter instruction
          payload = await requestPayload(true);
          try {
            applyResult = await applyArtifacts(context.projectPath, payload.artifacts, payload.files);
          } catch (retryErr) {
            const retryMsg = (retryErr as Error).message || "";
            if (retryMsg.includes("Missing contents for ")) {
              // Contract path: Ajv-validate full payload, then synthesize or fail explicitly
              const validated = await ajvValidateRepairIntake(context.projectPath, payload).catch(err => ({ ok: false as const, error: (err as Error).message }));
              if (!validated || ("ok" in validated && validated.ok === false)) {
                // Synthesize from files vs disk as last resort
                let artifacts = synthesizeArtifactsFromFiles(payload);
                const fileSet = new Set(payload.files.map(f => f.path));
                const filtered = artifacts.filter(a => a.action === 'delete' || fileSet.has(a.path));
                if (filtered.length === 0 && payload.files.length > 0) {
                  artifacts = payload.files.map(f => ({ path: f.path, action: 'modify' as const }));
                } else {
                  artifacts = filtered;
                }
                if (artifacts.length === 0 && payload.files.length === 0) {
                  const errorSummary = 'REPAIR_INCOMPLETE_ARTIFACT: no concrete changes available after retry';
                  await logEvent('repair_abort', { reason: 'incomplete_artifact', attempt: attemptNumber, project: context.projectSlug ?? 'project' });
                  const record: RepairAttemptRecord = {
                    number: attemptNumber,
                    status: 'error',
                    startedAt: new Date().toISOString(),
                    finishedAt: new Date().toISOString(),
                    changedFiles: [],
                    summary: errorSummary,
                    testResult: mapRunResult(currentRun),
                    durationMs: 0,
                    cumulativeTime
                  };
                  const history: RepairHistory = validateHistory({ attempts: [...attempts, record], finalStatus: 'fail', totalAttempts: attempts.length + 1, successAttemptNumber: undefined });
                  return history;
                }
                applyResult = await applyArtifacts(context.projectPath, artifacts, payload.files);
                payload.artifacts = artifacts;
              } else {
                // validated ok — nothing to change, rethrow to surface original missing-contents error if any
                throw retryErr;
              }
            } else {
              throw retryErr;
            }
          }
        } else if (msg.startsWith("Invalid delete:")) {
          // Contract violation: delete must target existing path → validate, attempt synthesize, else stop
          const validated = await ajvValidateRepairIntake(context.projectPath, payload).catch(() => null);
          if (!validated) {
            let artifacts = synthesizeArtifactsFromFiles(payload).filter(a => a.action !== 'delete');
            if (artifacts.length === 0 && payload.files.length === 0) {
              const errorSummary = 'REPAIR_INCOMPLETE_ARTIFACT: invalid delete without existing path';
              await logEvent('repair_abort', { reason: 'invalid_delete', attempt: attemptNumber, project: context.projectSlug ?? 'project' });
              const record: RepairAttemptRecord = {
                number: attemptNumber,
                status: 'error',
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                changedFiles: [],
                summary: errorSummary,
                testResult: mapRunResult(currentRun),
                durationMs: 0,
                cumulativeTime
              };
              const history: RepairHistory = validateHistory({ attempts: [...attempts, record], finalStatus: 'fail', totalAttempts: attempts.length + 1, successAttemptNumber: undefined });
              return history;
            }
            applyResult = await applyArtifacts(context.projectPath, artifacts, payload.files);
            payload.artifacts = artifacts;
          } else {
            throw applyErr;
          }
        } else {
          throw applyErr;
        }
      }
      changedFiles = applyResult.changed;

      for (const file of payload.files) {
        knownFiles.add(file.path);
      }
      for (const artifact of payload.artifacts) {
        if (artifact.action === "delete") {
          knownFiles.delete(artifact.path);
        }
      }

      diffSummaries = await recordDiffs(
        context.projectPath,
        payload.artifacts,
        payload.files,
        changedFiles,
        previousContents
      );

      runResult = await runInSandbox({
        projectRoot: context.projectPath,
        projectSlug: context.projectSlug ?? "project"
      });

      attemptStatus = runResult.status === "pass" ? "pass" : runResult.status;

      if (runResult.status !== "pass") {
        const log = await readFailureLog(context.projectPath, runResult);
        failureAnalysis = analyzeFailure(log);
        currentRun = runResult;
        currentFailureAnalysis = failureAnalysis;
      } else {
        failureAnalysis = null;
        successAttemptNumber = attemptNumber;
        finalStatus = "pass";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastErrorMessage = message;
      runResult = {
        status: "error",
        passCount: 0,
        failCount: 0,
        durationMs: 0,
        logsPath: "",
        timestamp: new Date().toISOString(),
        errorMessage: message
      };
      attemptStatus = "error";
      failureAnalysis = currentFailureAnalysis;
      diffSummaries = diffSummaries.length > 0 ? diffSummaries : [];
    }

    const finishedAt = Date.now();
    const finishedAtIso = new Date(finishedAt).toISOString();
    const durationMs = finishedAt - attemptStart;
    cumulativeTime += durationMs;

    summary = buildAttemptSummary(attemptNumber, attemptStatus, diffSummaries, failureAnalysis, lastErrorMessage);

    const attemptRecord: RepairAttemptRecord = {
      number: attemptNumber,
      status: attemptStatus,
      startedAt: startedAtIso,
      finishedAt: finishedAtIso,
      changedFiles,
      summary,
      strategy: selectedStrategy ?? undefined,
      testResult: mapRunResult(runResult),
      failureAnalysis: failureAnalysis ?? undefined,
      durationMs,
      cumulativeTime
    };

    attempts.push(attemptRecord);

    previousSummaries.push({
      attemptNumber,
      status: attemptStatus,
      summary,
      failureAnalysis,
      durationMs,
      strategy: selectedStrategy
    });

    if (attemptStatus === "pass") {
      break;
    }
  }

  if (!successAttemptNumber) {
    finalStatus = attempts.length >= 4 ? "exhausted" : "fail";
  }

  const history: RepairHistory = {
    attempts,
    finalStatus,
    totalAttempts: attempts.length,
    successAttemptNumber: successAttemptNumber ?? undefined
  };

  return validateHistory(history);
}
  function synthesizeArtifactsFromFiles(payload: ParsedRepairPayload): RepairArtifactDescription[] {
    const existing = new Map(payload.artifacts.map(a => [a.path, a] as const));
    const artifacts: RepairArtifactDescription[] = [...payload.artifacts];
    for (const file of payload.files) {
      if (!existing.has(file.path)) {
        artifacts.push({ path: file.path, action: 'modify' });
      }
    }
    return artifacts;
  }

// Ajv validation for full repair intake payload + runtime checks for disk state
type RepairIntake = {
  artifacts: { path: string; action: 'modify' | 'add' | 'delete' }[];
  files: { path: string; contents: string }[];
  notes?: string[];
};

const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true, strictSchema: false });
const repairIntakeSchema: JSONSchemaType<RepairIntake> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["artifacts", "files"],
  properties: {
    artifacts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "action"],
        properties: {
          path: { type: "string", minLength: 1 },
          action: { type: "string", enum: ["modify", "add", "delete"] as const },
          description: { type: "string", nullable: true }
        }
      }
    },
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "contents"],
        properties: {
          path: { type: "string", minLength: 1 },
          contents: { type: "string", minLength: 1 }
        }
      }
    },
    notes: { type: "array", items: { type: "string" }, nullable: true }
  }
};
const validateRepairIntakeSchema = ajv.compile(repairIntakeSchema);

async function ajvValidateRepairIntake(projectRoot: string, payload: ParsedRepairPayload): Promise<{ ok: true } | never> {
  const data: RepairIntake = { artifacts: payload.artifacts.map(a => ({ path: a.path, action: a.action })), files: payload.files.map(f => ({ path: f.path, contents: f.contents })), notes: payload.notes };
  const basicOk = validateRepairIntakeSchema(data);
  if (!basicOk) {
    const errs = (validateRepairIntakeSchema.errors || []).map(e => `${e.instancePath} ${e.message}`).join("; ");
    throw new Error(`repair-intake schema violation: ${errs}`);
  }
  // Cross checks: add/modify must have contents; delete must exist on disk
  const fileSet = new Set(data.files.map(f => f.path));
  for (const a of data.artifacts) {
    if (a.action === 'delete') {
      const abs = path.resolve(projectRoot, a.path);
      try { await fs.access(abs); } catch {
        throw new Error(`repair-intake invalid delete: missing on disk (${a.path})`);
      }
    } else {
      if (!fileSet.has(a.path)) {
        throw new Error(`repair-intake missing contents for ${a.path}`);
      }
    }
  }
  return { ok: true as const };
}

// retained for reference during future tightening — not used after synthesize path was added
// function hasIncompleteArtifacts(artifacts: RepairArtifactDescription[], files: ExecutorFile[]): string[] {
//   const fileSet = new Set(files.map(f => f.path));
//   const missing: string[] = [];
//   for (const a of artifacts) {
//     if (a.action !== 'delete' && !fileSet.has(a.path)) {
//       missing.push(a.path);
//     }
//   }
//   return missing;
// }
