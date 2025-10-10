import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as waitTimeout } from "node:timers/promises";

import { validateRunResult, type RunResult } from "../contracts/validators.js";
import { ensureDependencies } from "./installDeps.js";
import { detectTestCommand } from "./detectTestCommand.js";
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
  const { projectRoot, projectSlug, command: providedCommand, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...options.env,
    FORCE_COLOR: "0",
    CI: "1"
  };

  await fs.mkdir(projectRoot, { recursive: true });
  const logsDir = path.join(projectRoot, "logs");
  await fs.mkdir(logsDir, { recursive: true });
  const logFileName = `${projectSlug || "project"}_last_test_run_${randomUUID()}.log`;
  const logFilePath = path.join(logsDir, logFileName);

  const logStream = createWriteStream(logFilePath, { encoding: "utf-8" });
  let combinedOutput = "";
  let streamFailed = false;

  logStream.on("error", err => {
    streamFailed = true;
    console.error(`Log stream error for ${logFilePath}:`, (err as Error).message);
  });

  function safeWrite(data: string) {
    if (streamFailed) return;
    try {
      logStream.write(data);
    } catch (e) {
      streamFailed = true;
      console.warn("Log write failed:", (e as Error).message);
    }
  }

  let installSummary = "[install] skipped (node_modules present or package.json missing)";
  let installPerformed = false;
  try {
    const installResult = await ensureDependencies(projectRoot, timeoutMs);
    if (installResult.installed) {
      installPerformed = true;
      installSummary = `[install] ran ${installResult.command}`;
      combinedOutput += `${installSummary}\n`;
      safeWrite(`${installSummary}\n`);
      if (installResult.stdout) {
        combinedOutput += installResult.stdout;
        safeWrite(installResult.stdout);
      }
      if (installResult.stderr) {
        combinedOutput += installResult.stderr;
        safeWrite(installResult.stderr);
      }
    }
  } catch (installError) {
    const message = installError instanceof Error ? installError.message : String(installError);
    logStream.write(`[install] failed: ${message}\n`);
    logStream.end();
    throw installError;
  }

  const command = providedCommand ?? detectTestCommand(projectRoot);
  if (!installPerformed) {
    combinedOutput += `${installSummary}\n`;
    safeWrite(`${installSummary}\n`);
  }
  combinedOutput += `[sandbox] running ${command}\n`;
  safeWrite(`[sandbox] running ${command}\n`);

  const startedAt = new Date();
  const isWin = process.platform === "win32";
  const child = spawn(command, {
    cwd: projectRoot,
    env,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    detached: !isWin
  });

  let timedOut = false;
  function killTree(): void {
    try {
      if (isWin) {
        try {
          // Best-effort kill of process tree on Windows
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: true });
        } catch (_e) { void _e; }
      } else if (child.pid) {
        try { process.kill(-child.pid, "SIGKILL"); } catch (_e) { void _e; }
      }
    } catch (_e) { void _e; }
    try { child.kill("SIGKILL"); } catch (_e) { void _e; }
  }

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    killTree();
  }, timeoutMs).unref();

  child.stdout?.on("data", chunk => {
    const text = chunk.toString();
    combinedOutput += text;
    safeWrite(text);
  });
  child.stderr?.on("data", chunk => {
    const text = chunk.toString();
    combinedOutput += text;
    safeWrite(text);
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
