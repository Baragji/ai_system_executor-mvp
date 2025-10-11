import fs from "node:fs/promises";
import path from "node:path";

import { randomUUID } from "node:crypto";

export type StepStatus = "queued" | "running" | "completed" | "skipped" | "failed" | "paused";

export interface PlannedStepRecord {
  order: number;
  stepType: string;
  optional: boolean;
  stopOnSuccess: boolean;
  payload?: Record<string, unknown>;
}

export interface StepRecord {
  stepId: string;
  stepType: string;
  sequence: number;
  status: StepStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string; stack?: string };
  stop?: boolean;
}

export interface StepWorkflow {
  sessionId: string;
  cursor: number;
  steps: StepRecord[];
  updatedAt: string;
  plan?: PlannedStepRecord[];
}

interface StepQueuedInput {
  sessionId: string;
  stepId?: string;
  stepType: string;
  sequence: number;
  payload?: Record<string, unknown>;
}

interface StepCompletionInput {
  sessionId: string;
  stepId: string;
  status: Extract<StepStatus, "completed" | "skipped">;
  result?: Record<string, unknown>;
  stop?: boolean;
}

interface StepFailureInput {
  sessionId: string;
  stepId: string;
  error: unknown;
}

const WORKFLOW_ROOT = path.resolve(".automation", "checkpoints", "step-workflows");

function sanitizeSessionId(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    throw new Error("sessionId is required for checkpoint operations");
  }
  if (trimmed.includes("..") || trimmed.includes(path.sep)) {
    throw new Error("sessionId contains invalid characters");
  }
  return trimmed;
}

async function ensureRoot(): Promise<void> {
  await fs.mkdir(WORKFLOW_ROOT, { recursive: true });
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function clonePlan(plan: PlannedStepRecord[] | undefined): PlannedStepRecord[] | undefined {
  if (!plan || plan.length === 0) {
    return plan;
  }
  return plan.map(entry => ({
    order: entry.order,
    stepType: entry.stepType,
    optional: Boolean(entry.optional),
    stopOnSuccess: Boolean(entry.stopOnSuccess),
    payload: cloneValue(entry.payload)
  }));
}

async function readWorkflow(sessionId: string): Promise<StepWorkflow | null> {
  const safeId = sanitizeSessionId(sessionId);
  const filePath = path.join(WORKFLOW_ROOT, `${safeId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as StepWorkflow;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeWorkflow(workflow: StepWorkflow): Promise<void> {
  await ensureRoot();
  const safeId = sanitizeSessionId(workflow.sessionId);
  const filePath = path.join(WORKFLOW_ROOT, `${safeId}.json`);
  const payload = JSON.stringify(workflow, null, 2);
  await fs.writeFile(filePath, payload, "utf-8");
}

function upsertStep(workflow: StepWorkflow, record: StepRecord): StepWorkflow {
  const steps = workflow.steps.slice();
  const index = steps.findIndex(entry => entry.stepId === record.stepId);
  if (index >= 0) {
    steps[index] = { ...steps[index], ...record };
  } else {
    steps.push(record);
  }
  const cursor = Math.max(workflow.cursor, record.sequence);
  const updatedAt = new Date().toISOString();
  return {
    sessionId: workflow.sessionId,
    cursor,
    steps,
    updatedAt,
    ...(workflow.plan ? { plan: clonePlan(workflow.plan) } : {})
  };
}

function normalizePlan(plan: PlannedStepRecord[]): PlannedStepRecord[] {
  return plan.map(entry => ({
    order: entry.order,
    stepType: entry.stepType,
    optional: Boolean(entry.optional),
    stopOnSuccess: Boolean(entry.stopOnSuccess),
    payload: cloneValue(entry.payload)
  }));
}

export async function initializeWorkflow(sessionId: string, plan: PlannedStepRecord[]): Promise<void> {
  await ensureRoot();
  const safeId = sanitizeSessionId(sessionId);
  const workflow: StepWorkflow = {
    sessionId: safeId,
    cursor: -1,
    steps: [],
    updatedAt: new Date().toISOString(),
    plan: normalizePlan(plan)
  };
  await writeWorkflow(workflow);
}

export async function ensureWorkflowPlan(sessionId: string, plan: PlannedStepRecord[]): Promise<void> {
  await ensureRoot();
  const safeId = sanitizeSessionId(sessionId);
  const workflow = await readWorkflow(safeId);
  if (!workflow) {
    throw new Error(`Workflow not initialized for session ${sessionId}`);
  }
  if (workflow.plan && workflow.plan.length > 0) {
    return;
  }
  const updated: StepWorkflow = {
    ...workflow,
    plan: normalizePlan(plan),
    updatedAt: new Date().toISOString()
  };
  await writeWorkflow(updated);
}

export async function resetWorkflow(sessionId: string): Promise<void> {
  const safeId = sanitizeSessionId(sessionId);
  const filePath = path.join(WORKFLOW_ROOT, `${safeId}.json`);
  await ensureRoot();
  await fs.rm(filePath, { force: true });
}

export async function loadWorkflow(sessionId: string): Promise<StepWorkflow | null> {
  await ensureRoot();
  return readWorkflow(sessionId);
}

export async function recordStepQueued(input: StepQueuedInput): Promise<StepRecord> {
  await ensureRoot();
  const sessionId = sanitizeSessionId(input.sessionId);
  const workflow = (await readWorkflow(sessionId)) ?? {
    sessionId,
    cursor: -1,
    steps: [],
    updatedAt: new Date().toISOString(),
    plan: undefined
  };

  const stepId = input.stepId ?? randomUUID();
  const record: StepRecord = {
    stepId,
    stepType: input.stepType,
    sequence: input.sequence,
    status: "queued",
    queuedAt: new Date().toISOString(),
    payload: cloneValue(input.payload)
  };

  const next = upsertStep(workflow, record);
  await writeWorkflow(next);
  return record;
}

export async function recordStepRunning(sessionId: string, stepId: string): Promise<void> {
  const workflow = await readWorkflow(sessionId);
  if (!workflow) {
    throw new Error(`Workflow not initialized for session ${sessionId}`);
  }
  const step = workflow.steps.find(entry => entry.stepId === stepId);
  if (!step) {
    throw new Error(`Unknown step ${stepId} for session ${sessionId}`);
  }
  const updated: StepRecord = {
    ...step,
    status: "running",
    startedAt: new Date().toISOString(),
    error: undefined
  };
  const next = upsertStep(workflow, updated);
  await writeWorkflow(next);
}

export async function recordStepCompletion(input: StepCompletionInput): Promise<void> {
  const workflow = await readWorkflow(input.sessionId);
  if (!workflow) {
    throw new Error(`Workflow not initialized for session ${input.sessionId}`);
  }
  const step = workflow.steps.find(entry => entry.stepId === input.stepId);
  if (!step) {
    throw new Error(`Unknown step ${input.stepId} for session ${input.sessionId}`);
  }
  const updated: StepRecord = {
    ...step,
    status: input.status,
    completedAt: new Date().toISOString(),
    result: cloneValue(input.result),
    stop: Boolean(input.stop),
    error: undefined
  };
  const next = upsertStep(workflow, updated);
  await writeWorkflow(next);
}

export async function recordStepFailure(input: StepFailureInput): Promise<void> {
  const workflow = await readWorkflow(input.sessionId);
  if (!workflow) {
    throw new Error(`Workflow not initialized for session ${input.sessionId}`);
  }
  const step = workflow.steps.find(entry => entry.stepId === input.stepId);
  if (!step) {
    throw new Error(`Unknown step ${input.stepId} for session ${input.sessionId}`);
  }
  const err = input.error as Error | undefined;
  const updated: StepRecord = {
    ...step,
    status: "failed",
    completedAt: new Date().toISOString(),
    error: {
      message: err?.message ?? String(input.error),
      stack: err?.stack
    }
  };
  const next = upsertStep(workflow, updated);
  await writeWorkflow(next);
}

export async function recordStepPaused(input: StepFailureInput): Promise<void> {
  const workflow = await readWorkflow(input.sessionId);
  if (!workflow) {
    throw new Error(`Workflow not initialized for session ${input.sessionId}`);
  }
  const step = workflow.steps.find(entry => entry.stepId === input.stepId);
  if (!step) {
    throw new Error(`Unknown step ${input.stepId} for session ${input.sessionId}`);
  }
  const err = input.error as Error | undefined;
  const updated: StepRecord = {
    ...step,
    status: "paused",
    completedAt: new Date().toISOString(),
    error: {
      message: err?.message ?? String(input.error),
      stack: err?.stack
    }
  };
  const next = upsertStep(workflow, updated);
  await writeWorkflow(next);
}

export async function getNextSequence(sessionId: string): Promise<number> {
  await ensureRoot();
  const workflow = await readWorkflow(sessionId);
  if (!workflow) {
    return 0;
  }
  return workflow.cursor + 1;
}

export async function getStepRecord(sessionId: string, stepId: string): Promise<StepRecord | null> {
  const workflow = await readWorkflow(sessionId);
  if (!workflow) {
    return null;
  }
  const record = workflow.steps.find(entry => entry.stepId === stepId);
  return record ? { ...record } : null;
}
