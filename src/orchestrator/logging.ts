import { logEvent } from "../telemetry/events.js";

type StepStatus = "queued" | "running" | "completed" | "skipped" | "failed" | "paused";

interface StepEventInput {
  sessionId: string;
  stepId: string;
  stepType: string;
  sequence: number | null | undefined;
  status: StepStatus;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  manifestHash?: string;
  provider?: string;
  stop?: boolean;
  errorMessage?: string;
}

interface PauseEventInput {
  sessionId: string;
  status: "requested" | "acknowledged";
  reason?: string;
  stepId?: string;
  stepType?: string;
  sequence?: number | null;
  manifestHash?: string;
  checkpointAt?: string;
  provider?: string;
  questions?: number;
  durationMs?: number;
  queueLatencyMs?: number;
  trigger?: "api" | "worker" | "system";
}

interface ResumeEventInput {
  sessionId: string;
  checkpointAt: string;
  manifestHash?: string;
  provider?: string;
  questionsResolved: number;
  adjustment?: string;
  mode?: "queue" | "inline";
}

interface AbortEventInput {
  sessionId: string;
  reason?: string;
  provider?: string;
  manifestHash?: string;
  trigger?: "api" | "system";
  active: boolean;
}

function sanitizeProvider(candidate?: string): string {
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim().toLowerCase();
  }
  const envProvider = process.env.LLM_PROVIDER;
  if (typeof envProvider === "string" && envProvider.trim()) {
    return envProvider.trim().toLowerCase();
  }
  return "openai";
}

function sanitizeHash(hash?: string): string | undefined {
  if (typeof hash !== "string") {
    return undefined;
  }
  const trimmed = hash.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toIso(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return new Date(timestamp).toISOString();
}

function diffMs(start?: string, end?: string): number | undefined {
  const startIso = toIso(start);
  const endIso = toIso(end);
  if (!startIso || !endIso) {
    return undefined;
  }
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return undefined;
  }
  return endMs - startMs;
}

export async function logStepEvent(input: StepEventInput): Promise<void> {
  const provider = sanitizeProvider(input.provider);
  const manifestHash = sanitizeHash(input.manifestHash);
  const payload: Record<string, unknown> = {
    sessionId: input.sessionId,
    stepId: input.stepId,
    stepType: input.stepType,
    sequence: typeof input.sequence === "number" && Number.isFinite(input.sequence)
      ? input.sequence
      : undefined,
    status: input.status,
    provider
  };

  if (manifestHash) {
    payload.manifestHash = manifestHash;
  }
  if (input.stop !== undefined) {
    payload.stop = Boolean(input.stop);
  }
  const queuedAt = toIso(input.queuedAt);
  const startedAt = toIso(input.startedAt);
  const completedAt = toIso(input.completedAt);
  if (queuedAt) payload.queuedAt = queuedAt;
  if (startedAt) payload.startedAt = startedAt;
  if (completedAt) payload.completedAt = completedAt;

  const queueLatencyMs = diffMs(queuedAt, startedAt);
  const runDurationMs = diffMs(startedAt, completedAt);
  const totalDurationMs = diffMs(queuedAt, completedAt);

  if (queueLatencyMs !== undefined) {
    payload.queueLatencyMs = queueLatencyMs;
  }
  if (runDurationMs !== undefined) {
    payload.runDurationMs = runDurationMs;
  }
  if (totalDurationMs !== undefined) {
    payload.totalDurationMs = totalDurationMs;
  }
  if (input.errorMessage) {
    payload.error = input.errorMessage;
  }

  await logEvent("orchestrator.step", payload);
}

export async function logPauseEvent(input: PauseEventInput): Promise<void> {
  const provider = sanitizeProvider(input.provider);
  const manifestHash = sanitizeHash(input.manifestHash);
  const payload: Record<string, unknown> = {
    sessionId: input.sessionId,
    status: input.status,
    provider,
    trigger: input.trigger ?? "api"
  };
  if (input.reason) {
    payload.reason = input.reason;
  }
  if (input.stepId) {
    payload.stepId = input.stepId;
  }
  if (input.stepType) {
    payload.stepType = input.stepType;
  }
  if (input.sequence !== null && input.sequence !== undefined) {
    payload.sequence = input.sequence;
  }
  if (manifestHash) {
    payload.manifestHash = manifestHash;
  }
  const checkpointAt = toIso(input.checkpointAt);
  if (checkpointAt) {
    payload.checkpointAt = checkpointAt;
  }
  if (typeof input.questions === "number") {
    payload.questions = input.questions;
  }
  if (input.durationMs !== undefined) {
    payload.durationMs = input.durationMs;
  }
  if (input.queueLatencyMs !== undefined) {
    payload.queueLatencyMs = input.queueLatencyMs;
  }

  await logEvent("orchestrator.pause", payload);
}

export async function logResumeEvent(input: ResumeEventInput): Promise<void> {
  const provider = sanitizeProvider(input.provider);
  const manifestHash = sanitizeHash(input.manifestHash);
  const payload: Record<string, unknown> = {
    sessionId: input.sessionId,
    checkpointAt: toIso(input.checkpointAt),
    provider,
    questionsResolved: input.questionsResolved,
    mode: input.mode ?? "inline"
  };
  if (manifestHash) {
    payload.manifestHash = manifestHash;
  }
  if (input.adjustment) {
    payload.adjustment = input.adjustment;
  }
  await logEvent("orchestrator.resume", payload);
}

export async function logAbortEvent(input: AbortEventInput): Promise<void> {
  const provider = sanitizeProvider(input.provider);
  const manifestHash = sanitizeHash(input.manifestHash);
  const payload: Record<string, unknown> = {
    sessionId: input.sessionId,
    provider,
    trigger: input.trigger ?? "api",
    active: Boolean(input.active)
  };
  if (input.reason) {
    payload.reason = input.reason;
  }
  if (manifestHash) {
    payload.manifestHash = manifestHash;
  }
  await logEvent("orchestrator.abort", payload);
}
