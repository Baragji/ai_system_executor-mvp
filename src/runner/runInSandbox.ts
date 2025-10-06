import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as waitTimeout } from "node:timers/promises";

import { validateRunResult, type RunResult } from "../contracts/validators.js";
import { logEvaluationResult, type EvaluationResult } from "../evaluation/logResults.js";

export interface RunInSandboxOptions {
  projectRoot: string;
  projectSlug: string;
  command?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function parseCounts(log: string): { passCount: number; failCount: number } {
  let passCount = 0;
  let failCount = 0;

  const lines = log.split(/\r?\n/);
  // Strip common ANSI color codes to make regexes robust across CLI outputs
  // Use RegExp constructed from a string to avoid eslint no-control-regex on literal
  // eslint-disable-next-line no-control-regex
  const ANSI_RE = new RegExp("\\u001B\\[[0-9;]*m", "g");
  const stripAnsi = (s: string) => s.replace(ANSI_RE, "");

  for (const rawLine of lines) {
    const line = stripAnsi(rawLine).trim();
    if (!line) continue;

    // Vitest/Jest style: "Tests: 3 passed, 1 failed"
    if (/^Tests?\b/i.test(line)) {
      const passMatch = line.match(/(\d+)\s+passed/i);
      const passGroup = passMatch?.[1];
      if (passGroup !== undefined) {
        passCount = Number.parseInt(passGroup, 10);
      }

      const failMatch = line.match(/(\d+)\s+failed/i);
      const failGroup = failMatch?.[1];
      if (failGroup !== undefined) {
        failCount = Number.parseInt(failGroup, 10);
      }
      continue;
    }

    // Node test TAP summary: "# pass 2", "# fail 1"
    const tapMatch = line.match(/^#\s*(pass|fail|tests)\s+(\d+)/i);
    if (tapMatch) {
      const key = tapMatch[1]!.toLowerCase();
      const val = Number.parseInt(tapMatch[2]!, 10);
      if (key === "pass") passCount = val;
      if (key === "fail") failCount = val;
      continue;
    }
  }

  return { passCount, failCount };
}

function deriveStatus(exitCode: number | null, timedOut: boolean): RunResult["status"] {
  if (timedOut) return "error";
  if (exitCode === 0) return "pass";
  if (exitCode === null) return "error";
  return exitCode === 0 ? "pass" : "fail";
}

export async function runInSandbox(options: RunInSandboxOptions): Promise<RunResult> {
  const { projectRoot, projectSlug, command = "npm test", timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...options.env,
    FORCE_COLOR: "0"
  };

  await fs.mkdir(projectRoot, { recursive: true });
  const logsDir = path.join(projectRoot, "logs");
  await fs.mkdir(logsDir, { recursive: true });
  const logFileName = `${projectSlug || "project"}_last_test_run_${randomUUID()}.log`;
  const logFilePath = path.join(logsDir, logFileName);

  const logStream = createWriteStream(logFilePath, { encoding: "utf-8" });
  let combinedOutput = "";

  const startedAt = new Date();
  const child = spawn(command, {
    cwd: projectRoot,
    env,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let timedOut = false;
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs).unref();

  child.stdout?.on("data", chunk => {
    const text = chunk.toString();
    combinedOutput += text;
    logStream.write(text);
  });
  child.stderr?.on("data", chunk => {
    const text = chunk.toString();
    combinedOutput += text;
    logStream.write(text);
  });

  const exitPromise = new Promise<{ code: number | null; signal: string | null }>(resolve => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });

  const { code, signal } = await exitPromise.finally(() => {
    clearTimeout(timeoutHandle);
    logStream.end();
  });

  if (timedOut) {
    await waitTimeout(50);
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const { passCount, failCount } = parseCounts(combinedOutput);

  const runResult: RunResult = {
    status: deriveStatus(code ?? null, timedOut),
    passCount,
    failCount,
    durationMs,
    logsPath: path.relative(projectRoot, logFilePath),
    timestamp: finishedAt.toISOString(),
    command,
    exitCode: code ?? undefined,
    signal: signal ?? undefined,
    timedOut: timedOut || undefined,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    errorMessage: timedOut ? `Process timed out after ${timeoutMs}ms` : undefined
  };

  const validation = validateRunResult(runResult);
  if (!validation.ok) {
    throw new Error(`runInSandbox produced invalid run result: ${validation.errors}`);
  }

  const evaluation: EvaluationResult = {
    timestamp: finishedAt.toISOString(),
    phase: process.env.EXECUTOR_PHASE ?? "2A-OBSERVABILITY-FIX",
    task_id: options.projectSlug ? `run-tests:${options.projectSlug}` : "run-tests",
    status: runResult.status === "pass" ? "pass" : "fail",
    quality_dimensions: {
      correctness: runResult.status === "pass",
      completeness: runResult.passCount > 0,
      safety: runResult.status !== "error"
    },
    notes: runResult.errorMessage
  };

  try {
    await logEvaluationResult(evaluation);
  } catch (err) {
    console.warn("Failed to log evaluation result", err);
  }

  return runResult;
}
