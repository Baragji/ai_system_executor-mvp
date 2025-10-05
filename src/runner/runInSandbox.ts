import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as waitTimeout } from "node:timers/promises";

import { validateRunResult, type RunResult } from "../contracts/validators.js";

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
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^Tests?\b/i.test(line)) {
      const passMatch = line.match(/(\d+)\s+passed/i);
      if (passMatch?.[1]) passCount = Number.parseInt(passMatch[1], 10);
      const failMatch = line.match(/(\d+)\s+failed/i);
      if (failMatch?.[1]) failCount = Number.parseInt(failMatch[1], 10);
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

  return runResult;
}
