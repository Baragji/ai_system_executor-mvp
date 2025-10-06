import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import slugify from "slugify";

import { generateJSON } from "./llm/index.js";
import { validateExecutorOutput } from "./executor/schema.js";
import { writeFiles } from "./executor/writeFiles.js";
import { runInSandbox } from "./runner/runInSandbox.js";
import { multiTurnRepair } from "./repair/multiTurnRepair.js";
import type { FailureCategory, RepairHistory, RepairAttemptRecord } from "./contracts/repairHistoryValidator.js";
import { fileSha256 } from "./utils/checksum.js";
import { logEvent } from "./telemetry/events.js";
import type { ExecutorOutput, ExecutorFile } from "./executor/types.js";
import type { RunResult } from "./contracts/validators.js";
import { detectMissing } from "./clarification/detectMissing.js";
import { generateQuestions } from "./clarification/generateQuestions.js";
import { augmentPrompt } from "./clarification/augmentPrompt.js";
import {
  validateClarificationRequest,
  validateClarificationResponse
} from "./contracts/validators.js";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  ClarificationResponse
} from "./clarification/types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const PORT = Number(process.env.PORT || 3000);
const OUTPUT_DIR = path.resolve("output");
const PUBLIC_DIR = path.resolve("public");

const CLARIFICATION_SESSION_TTL_MS = 10 * 60 * 1000;

type ClarificationSession = {
  questions: ClarificationQuestion[];
  storedAt: number;
};

const clarificationSessions = new Map<string, ClarificationSession>();

function clarificationSessionKey(prompt: string): string | null {
  const normalized = prompt.trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function purgeExpiredSessions(now: number) {
  for (const [key, entry] of clarificationSessions.entries()) {
    if (now - entry.storedAt > CLARIFICATION_SESSION_TTL_MS) {
      clarificationSessions.delete(key);
    }
  }
}

function rememberClarificationQuestions(prompt: string, questions: ClarificationQuestion[]) {
  if (!questions || questions.length === 0) return;
  const key = clarificationSessionKey(prompt);
  if (!key) return;
  const now = Date.now();
  purgeExpiredSessions(now);
  clarificationSessions.set(key, { questions, storedAt: now });
}

function consumeClarificationQuestions(prompt: string): ClarificationQuestion[] | undefined {
  const key = clarificationSessionKey(prompt);
  if (!key) return undefined;
  purgeExpiredSessions(Date.now());
  const entry = clarificationSessions.get(key);
  if (!entry) return undefined;
  clarificationSessions.delete(key);
  return entry.questions;
}

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.use("/", express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.use("/output", express.static(OUTPUT_DIR, { extensions: ["html"] }));

async function ensureMetaDirectory(root: string) {
  await fs.mkdir(root, { recursive: true });
}

async function computeFileChecksums(pathsToHash: string[], projectRoot: string) {
  const entries = [] as { path: string; sha256: string }[];
  for (const relativePath of pathsToHash) {
    const abs = path.join(projectRoot, relativePath);
    try {
      const hash = await fileSha256(abs);
      entries.push({ path: relativePath, sha256: hash });
    } catch (err) {
      console.warn(`Failed to hash ${relativePath}:`, err);
    }
  }
  return entries;
}

function collectFilePaths(files: ExecutorFile[], repairHistory?: RepairHistory | null): string[] {
  const paths = new Set(files.map(file => file.path));
  if (repairHistory) {
    for (const attempt of repairHistory.attempts) {
      for (const changed of attempt.changedFiles) {
        if (!changed) continue;
        paths.add(changed);
      }
    }
  }
  return Array.from(paths);
}

function buildTestRunEntry(attempt: string, run: RunResult) {
  return {
    attempt,
    status: run.status,
    passCount: run.passCount,
    failCount: run.failCount,
    durationMs: run.durationMs,
    logsPath: run.logsPath,
    timestamp: run.timestamp
  };
}

function attemptToRunResult(attempt: RepairAttemptRecord): RunResult {
  return {
    status: attempt.testResult.status,
    passCount: attempt.testResult.passCount,
    failCount: attempt.testResult.failCount,
    durationMs: attempt.testResult.durationMs ?? attempt.durationMs,
    logsPath: attempt.testResult.logsPath ?? "",
    timestamp: attempt.finishedAt ?? new Date().toISOString(),
    errorMessage: attempt.testResult.errorMessage,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    command: "npm test"
  };
}

type RepairMetrics = {
  totalAttempts: number;
  successAttempt: number | null;
  timePerAttempt: number[];
  failureTypes: FailureCategory[];
  exhausted: boolean;
  attemptEfficiency: number;
};

function computeRepairMetrics(history: RepairHistory | null): RepairMetrics | null {
  if (!history || history.attempts.length === 0) {
    return null;
  }

  const totalAttempts = history.totalAttempts;
  const successAttempt = history.successAttemptNumber ?? null;
  const timePerAttempt = history.attempts.map(attempt => attempt.durationMs);
  const failureTypes = history.attempts
    .map(attempt => attempt.failureAnalysis?.category)
    .filter((category): category is FailureCategory => typeof category === "string");
  const exhausted = history.finalStatus === "exhausted";
  const attemptEfficiency = history.finalStatus === "pass" && successAttempt
    ? successAttempt / totalAttempts
    : 0;

  return {
    totalAttempts,
    successAttempt,
    timePerAttempt,
    failureTypes,
    exhausted,
    attemptEfficiency
  };
}

// Sanitize model output before schema validation to improve resilience.
// - Drops unknown top-level properties
// - Normalizes file paths (removes leading "./")
// - Ensures files array contains only { path, contents } with string types
export function sanitizeExecutorOutput(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const invalidStart = /^([/]|[A-Za-z]:|\.{1,2}|\\)/;

  if (typeof obj.project_name === "string") {
    out.project_name = obj.project_name;
  }

  if (Array.isArray(obj.files)) {
    const files = obj.files
      .map((f: unknown) => {
        if (!f || typeof f !== "object") return null;
        const fo = f as Record<string, unknown>;
        const rawPath = typeof fo.path === "string" ? fo.path : null;
        const rawContents = typeof fo.contents === "string" ? fo.contents : null;
        if (!rawPath || !rawContents) return null;
        const normalizedPath = rawPath.replace(/^(?:\.\/)+/, "");
        if (invalidStart.test(normalizedPath)) return null;
        return { path: normalizedPath, contents: rawContents };
      })
      .filter((f: unknown) => !!f);
    if (files.length > 0) {
      out.files = files as unknown[];
    }
  }

  if (Array.isArray(obj.notes)) {
    out.notes = (obj.notes as unknown[]).filter(n => typeof n === "string");
  }

  // Infer hasTests=true if any test files present; default false if missing.
  if (Array.isArray(out.files)) {
    const files = out.files as { path: string; contents: string }[];
    const hasTestFiles = files.some(f =>
      /(^|\/)__(tests)__\//.test(f.path) ||
      /(^|\/)tests\//.test(f.path) ||
      /\.test\.[tj]s$/.test(f.path)
    );
    let hasTestsFlag: boolean | undefined = typeof obj.hasTests === "boolean" ? (obj.hasTests as boolean) : undefined;
    if (hasTestFiles) {
      hasTestsFlag = true;
    } else if (hasTestsFlag === undefined) {
      hasTestsFlag = false;
    }
    out.hasTests = hasTestsFlag;
  } else if (typeof obj.hasTests === "boolean") {
    out.hasTests = obj.hasTests as boolean;
  }

  return out;
}

app.post("/api/clarify", (req, res) => {
  try {
    const promptRaw = req.body?.prompt;
    const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
    if (!prompt) {
      return res.status(400).json({ error: "prompt required" });
    }

    const missing = detectMissing(prompt);
    const questions = generateQuestions(missing, prompt);
    rememberClarificationQuestions(prompt, questions);
    const payload = { questions };
    const validation = validateClarificationRequest(payload);
    if (!validation.ok) {
      console.error("Clarification payload failed validation", validation.errors);
      return res.status(500).json({ error: "clarification contract violation" });
    }

    return res.json(payload);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/execute", async (req, res) => {
  try {
    const promptRaw = req.body?.prompt;
    const originalPrompt: string = promptRaw === undefined ? "" : promptRaw.toString();
    const promptForValidation = originalPrompt.trim();
    const projectNameRaw: string | undefined = req.body?.projectName;
    if (!promptForValidation || promptForValidation.length < 3) {
      return res.status(400).json({ error: "prompt required" });
    }

    let clarificationsUsed = false;
    let clarifications: ClarificationResponse | undefined;

    if (req.body?.clarifications !== undefined) {
      const validation = validateClarificationResponse(req.body.clarifications);
      if (!validation.ok) {
        return res.status(400).json({ error: "invalid clarifications", details: validation.errors });
      }
      clarifications = validation.value;
    }

    let effectivePrompt = originalPrompt;
    if (clarifications) {
      const augmented = augmentPrompt(originalPrompt, clarifications);
      if (augmented !== originalPrompt) {
        clarificationsUsed = true;
        effectivePrompt = augmented;
      }
    }

    const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: effectivePrompt }
    ];

    const raw = await generateJSON(messages);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(422).json({ error: "Model did not return valid JSON", raw });
    }

    // Pre-validate sanitization to strip extras and normalize paths
    const sanitized = sanitizeExecutorOutput(data);
    const result = validateExecutorOutput(sanitized);
    if (!result.ok) {
      return res.status(422).json({ error: "JSON failed schema validation", details: result.errors });
    }

    const output = result.value as ExecutorOutput;
    if (!output.hasTests) {
      return res.status(422).json({ error: "Generated output must include tests and set hasTests=true" });
    }

    const projectName = (projectNameRaw && projectNameRaw.trim().length > 0)
      ? projectNameRaw.trim()
      : (output.project_name || "generated-project");
    const slug = slugify(projectName, { lower: true, strict: true });
    const targetRoot = path.join(OUTPUT_DIR, slug);

    await fs.mkdir(targetRoot, { recursive: true });
    await ensureMetaDirectory(targetRoot);
    await logEvent("generation_start", { project: slug });

    await writeFiles(targetRoot, output.files);

    const initialRun = await runInSandbox({
      projectRoot: targetRoot,
      projectSlug: slug
    });
    await logEvent("test_run", { project: slug, stage: "initial", status: initialRun.status });

    let repairHistory: RepairHistory | null = null;
    const attemptRuns: { attempt: RepairAttemptRecord; run: RunResult }[] = [];

    if (initialRun.status !== "pass") {
      repairHistory = await multiTurnRepair({
        projectPath: targetRoot,
        projectSlug: slug,
        originalPrompt: effectivePrompt,
        generatedFiles: output.files,
        initialTestResult: initialRun
      });

      await logEvent("repair_attempt", {
        project: slug,
        attempted: repairHistory.totalAttempts > 0,
        repaired: repairHistory.finalStatus === "pass",
        attempts: repairHistory.totalAttempts,
        finalStatus: repairHistory.finalStatus
      });

      for (const attempt of repairHistory.attempts) {
        const run = attemptToRunResult(attempt);
        attemptRuns.push({ attempt, run });
        await logEvent("test_run", { project: slug, stage: `repair_${attempt.number}`, status: run.status });
      }
    }

    const finalAttempt = repairHistory?.attempts.at(-1) ?? null;
    const finalRunResult = finalAttempt ? attemptToRunResult(finalAttempt) : null;
    const fileMetadata = await computeFileChecksums(collectFilePaths(output.files, repairHistory), targetRoot);
    const storedQuestions = consumeClarificationQuestions(originalPrompt) ?? [];
    let clarificationQuestions: ClarificationQuestion[] = storedQuestions;
    let clarificationAsked = clarificationQuestions.length > 0;
    if (!clarificationAsked && clarifications && clarifications.answers.length > 0) {
      const missingAgain = detectMissing(originalPrompt);
      clarificationQuestions = generateQuestions(missingAgain, originalPrompt);
      clarificationAsked = clarificationQuestions.length > 0;
    }
    const clarificationAnswers: ClarificationAnswer[] = clarifications
      ? clarifications.answers.map<ClarificationAnswer>(answer => ({ ...answer }))
      : [];
    const overallFinalStatus = finalRunResult?.status ?? initialRun.status;
    const clarificationTelemetry = {
      asked: clarificationAsked,
      questions: clarificationQuestions,
      answers: clarificationAnswers,
      improvedSuccess: clarificationsUsed && overallFinalStatus === "pass"
    };

    const repairSummary = repairHistory
      ? {
          attempted: repairHistory.totalAttempts > 0,
          repaired: repairHistory.finalStatus === "pass",
          appliedFiles: repairHistory.attempts.reduce((sum, attempt) => sum + attempt.changedFiles.length, 0),
          notes: repairHistory.attempts
            .map(attempt => attempt.summary)
            .filter((note): note is string => typeof note === "string" && note.length > 0),
          error:
            repairHistory.finalStatus === "pass"
              ? null
              : repairHistory.attempts.at(-1)?.testResult.errorMessage ?? null,
          artifacts: [],
          finalStatus: repairHistory.finalStatus,
          successAttemptNumber: repairHistory.successAttemptNumber ?? null
        }
      : {
          attempted: false,
          repaired: initialRun.status === "pass",
          appliedFiles: 0,
          notes: [],
          error: null,
          artifacts: [],
          finalStatus: initialRun.status,
          successAttemptNumber: null
        };

    const repairMetrics = computeRepairMetrics(repairHistory);

    const testRuns = [
      buildTestRunEntry("initial", initialRun),
      ...attemptRuns.map(({ attempt, run }) => buildTestRunEntry(`repair-${attempt.number}`, run))
    ];

    const meta = {
      created_at: new Date().toISOString(),
      source_prompt: effectivePrompt,
      original_prompt: originalPrompt,
      clarification: clarificationTelemetry,
      clarifications: {
        used: clarificationsUsed,
        answers: clarificationAnswers,
        asked: clarificationTelemetry.asked
      },
      notes: output.notes || [],
      testRuns,
      repair: repairSummary,
      repairHistory,
      repairMetrics,
      files: fileMetadata
    };

    await fs.writeFile(path.join(targetRoot, "_executor_meta.json"), JSON.stringify(meta, null, 2), "utf-8");

    await logEvent("generation_complete", {
      project: slug,
      status: overallFinalStatus
    });

    return res.json({
      ok: true,
      project: slug,
      files_written: output.files.length,
      browse_url: `/output/${slug}/`,
      abs_path: targetRoot,
      testResults: {
        initial: initialRun,
        afterRepair: finalRunResult
      },
      repair: repairSummary,
      repairHistory,
      repairMetrics,
      clarificationsUsed,
      generated: effectivePrompt
    });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/run-tests", async (req, res) => {
  try {
    const project: string = (req.body?.project || "").toString();
    if (!project) {
      return res.status(400).json({ error: "project required" });
    }
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try {
      await fs.access(projectRoot);
    } catch {
      return res.status(404).json({ error: "project not found" });
    }

    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
    return res.json(run);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Executor MVP listening on http://localhost:${PORT}`);
    console.log(`UI: http://localhost:${PORT}/`);
  });
}

export { app };
