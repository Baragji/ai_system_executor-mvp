import path from "node:path";

import { withTraceContext } from "../telemetry/trace.js";
import { generateSubtaskOutputWithRetry } from "../domain/generateSubtaskOutput.js";
import { writeFiles } from "../domain/writeFiles.js";
import { ensureDefaultExportForApp } from "../domain/normalizeExports.js";
import { ensureJsonHealthOnDisk } from "../domain/normalizeHealth.js";
import { runInSandbox } from "../domain/runInSandbox.js";
import { multiTurnRepair } from "../domain/multiTurnRepair.js";
import { logEvent } from "../telemetry/events.js";
import { writeFixture } from "../domain/fixtures.js";
import { throwIfAborted } from "../domain/abortSignal.js";
import type { ClarificationResponse, PlanExecutionContext, SubtaskPromptRequest } from "../domain/planning.js";

async function captureFixture(
  sessionId: string | undefined,
  slug: string,
  relPath: string,
  data: unknown,
): Promise<void> {
  if (!sessionId) {
    return;
  }

  try {
    await writeFixture(slug, sessionId, relPath, data);
  } catch (error) {
    console.warn(`[planning] Failed to write fixture ${relPath}`, error);
  }
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function readSubtaskTimeout(): number {
  const raw = process.env.SUBTASK_TIMEOUT_MS;
  if (!raw) {
    return 120000;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 120000;
  }

  return parsed;
}

const SUBTASK_TIMEOUT_MS = readSubtaskTimeout();

function shouldCaptureFixtures(): boolean {
  if (process.env.NODE_ENV === "test") {
    return truthy(process.env.CAPTURE_FIXTURES_IN_TESTS) || false;
  }
  return true;
}

export interface PlanExecutionContextOptions {
  targetRoot: string;
  slug: string;
  effectivePrompt: string;
  clarifications?: ClarificationResponse;
  systemPrompt: string;
  sessionId?: string;
}

export function createPlanExecutionContext({
  targetRoot,
  slug,
  effectivePrompt,
  clarifications,
  systemPrompt,
  sessionId,
}: PlanExecutionContextOptions): PlanExecutionContext {
  const captureEnabled = shouldCaptureFixtures();

  return {
    projectPath: targetRoot,
    projectSlug: slug,
    sessionId,
    originalPrompt: effectivePrompt,
    clarifications,
    previousSubtaskResults: [],
    generateSubtaskOutput: async (request: SubtaskPromptRequest) => {
      const label = `subtask:${request.subtask.id}`;
      throwIfAborted(sessionId, `subtask_${request.subtask.id}`);

      const raceWithAbort = async <T>(work: () => Promise<T>): Promise<T> => {
        const signal = AbortSignal.timeout(SUBTASK_TIMEOUT_MS);
        return new Promise<T>((resolve, reject) => {
          const onAbort = async () => {
            const message = `${label} aborted after ${SUBTASK_TIMEOUT_MS}ms`;
            await logEvent("plan_abort", { phase: "subtask", subtask: request.subtask.id, reason: message });
            const err: Error & { code?: string } = new Error(message);
            err.code = "ABORT_ERR";
            reject(err);
          };

          signal.addEventListener("abort", onAbort, { once: true });

          work().then(
            value => {
              signal.removeEventListener("abort", onAbort);
              resolve(value);
            },
            error => {
              signal.removeEventListener("abort", onAbort);
              reject(error);
            },
          );
        });
      };

      const output = await withTraceContext(
        { projectSlug: slug, sessionId, phase: "subtask", subtaskId: request.subtask.id },
        async () =>
          raceWithAbort(() =>
            generateSubtaskOutputWithRetry(
              systemPrompt,
              request,
              false,
              undefined,
              (attempt, reason) =>
                logEvent("plan_progress", {
                  project: slug,
                  subtask: request.subtask.id,
                  status: "retry",
                  percent: 0,
                  attempt,
                  reason,
                }),
            ),
          ),
      );

      if (captureEnabled) {
        await captureFixture(
          sessionId,
          slug,
          path.join("subtasks", request.subtask.id, "output.json"),
          output,
        );
      }

      return output;
    },
    writeFiles: async (rootDir, files) => {
      await writeFiles(rootDir, files);
      await ensureDefaultExportForApp(rootDir);
      await ensureJsonHealthOnDisk(rootDir);
    },
    runTests: options => runInSandbox(options),
    multiTurnRepair: context => multiTurnRepair(context),
    logTelemetry: event =>
      logEvent("plan_progress", {
        project: slug,
        subtask: event.subtaskId,
        status: event.status,
        percent: Number(event.progress.percentComplete.toFixed(2)),
      }),
    onProgressUpdate: snapshot =>
      logEvent("plan_snapshot", {
        project: slug,
        completed: snapshot.completedSubtasks,
        failed: snapshot.failedSubtasks,
        percent: Number(snapshot.percentComplete.toFixed(2)),
      }),
    onPromptBuilt: async request => {
      if (!captureEnabled) {
        return;
      }

      await captureFixture(sessionId, slug, path.join("subtasks", request.subtask.id, "prompt.json"), {
        subtaskId: request.subtask.id,
        title: request.subtask.title,
        prompt: request.prompt,
      });
    },
    now: () => Date.now(),
  };
}
