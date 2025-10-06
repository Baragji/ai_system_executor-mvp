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
import { fileSha256 } from "./utils/checksum.js";
import { logEvent } from "./telemetry/events.js";
import type { ExecutorOutput, ExecutorFile } from "./executor/types.js";
import type { RunResult } from "./contracts/validators.js";
import type { FailureCategory, RepairHistory, TestResultSummary } from "./contracts/repairHistoryValidator.js";
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

async function collectFilePaths(
  projectRoot: string,
  files: ExecutorFile[],
  extraPaths: string[]
): Promise<string[]> {
  const paths = new Set(files.map(file => file.path));
  for (const candidate of extraPaths) {
    if (!candidate) continue;
    paths.add(candidate);
  }

  const existing: string[] = [];
  for (const candidate of paths) {
    const absolute = path.join(projectRoot, candidate);
    try {
      await fs.access(absolute);
      existing.push(candidate);
    } catch {
      // Skip files that no longer exist after repairs (deleted during attempts)
    }
  }

  return existing;
}

function buildTestRunEntry(attempt: string, run: RunResult | TestResultSummary) {
  return {
    attempt,
    status: run.status,
    passCount: run.passCount,
    failCount: run.failCount,
    durationMs: run.durationMs ?? 0,
    logsPath: run.logsPath,
    timestamp: "timestamp" in run && run.timestamp ? run.timestamp : new Date().toISOString()
  };
}

function gatherChangedPaths(history: RepairHistory | null | undefined): string[] {
  if (!history) return [];
  const paths = new Set<string>();
  for (const attempt of history.attempts) {
    for (const changed of attempt.changedFiles) {
      if (changed) {
        paths.add(changed);
      }
    }
  }
  return Array.from(paths);
}

function buildRepairSummary(initialRun: RunResult, history: RepairHistory) {
  const attempted = initialRun.status !== "pass";
  const finalAttempt = history.attempts.at(-1);
  const finalStatus = finalAttempt?.testResult.status ?? initialRun.status;

  return {
    attempted,
    repaired: finalStatus === "pass",
    appliedFiles: finalAttempt?.changedFiles.length ?? 0,
    notes: [] as string[],
    error: finalStatus === "pass" ? null : `final status: ${history.finalStatus}`,
    artifacts: [] as unknown[]
  };
}

function buildRepairMetrics(history: RepairHistory) {
  const totalAttempts = history.attempts.length;
  const successAttempt = history.successAttemptNumber;
  const timePerAttempt = history.attempts.map(attempt => attempt.durationMs);
  const failureTypes = history.attempts
    .map(attempt => attempt.failureAnalysis?.category)
    .filter((category): category is FailureCategory => Boolean(category));
  const exhausted = history.finalStatus === "exhausted";
  const efficiency = successAttempt && totalAttempts > 0 && !exhausted
    ? successAttempt / totalAttempts
    : 0;

  const metrics: Record<string, unknown> = {
    totalAttempts,
    timePerAttempt,
    failureTypes,
    exhausted,
    attemptEfficiency: Number.isFinite(efficiency) ? Number(efficiency.toFixed(2)) : 0
  };

  if (successAttempt) {
    metrics.successAttempt = successAttempt;
  }

  return metrics;
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

    const repairHistory = await multiTurnRepair({
      projectPath: targetRoot,
      projectSlug: slug,
      originalPrompt: effectivePrompt,
      generatedFiles: output.files.map(file => file.path),
      initialTestResult: initialRun
    });

    await logEvent("repair_attempt", {
      project: slug,
      attempts: repairHistory.totalAttempts,
      finalStatus: repairHistory.finalStatus,
      successAttempt: repairHistory.successAttemptNumber ?? null
    });

    const testRunEntries = [buildTestRunEntry("initial", initialRun)];
    if (initialRun.status !== "pass") {
      for (const attempt of repairHistory.attempts) {
        testRunEntries.push(buildTestRunEntry(`repair-${attempt.number}`, attempt.testResult));
        await logEvent("test_run", {
          project: slug,
          stage: `repair-${attempt.number}`,
          status: attempt.testResult.status
        });
      }
    }

    const afterRepairResult = initialRun.status === "pass"
      ? null
      : repairHistory.attempts.at(-1)?.testResult ?? null;
    const finalStatus = afterRepairResult?.status ?? initialRun.status;

    const changedPaths = gatherChangedPaths(repairHistory);
    const relevantPaths = await collectFilePaths(targetRoot, output.files, changedPaths);
    const fileMetadata = await computeFileChecksums(relevantPaths, targetRoot);
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
    const clarificationTelemetry = {
      asked: clarificationAsked,
      questions: clarificationQuestions,
      answers: clarificationAnswers,
      improvedSuccess: clarificationsUsed && finalStatus === "pass"
    };

    const repairSummary = buildRepairSummary(initialRun, repairHistory);
    const responseTestResults = {
      initial: initialRun,
      afterRepair: afterRepairResult
    };

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
      testRuns: testRunEntries,
      repair: repairSummary,
      repairMetrics: buildRepairMetrics(repairHistory),
      repairHistory,
      files: fileMetadata
    };

    await fs.writeFile(path.join(targetRoot, "_executor_meta.json"), JSON.stringify(meta, null, 2), "utf-8");

    await logEvent("generation_complete", {
      project: slug,
      status: finalStatus
    });

    return res.json({
      ok: true,
      project: slug,
      files_written: output.files.length,
      browse_url: `/output/${slug}/`,
      abs_path: targetRoot,
      testResults: responseTestResults,
      repairMetrics: meta.repairMetrics,
      repairHistory,
      repair: meta.repair,
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
