import fs from "node:fs/promises";
import path from "node:path";

const TELEMETRY_DIR = path.resolve(".telemetry");
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, "events.log");
const AUTOMATION_DIR = path.resolve(".automation");
const TRACE_FILE = path.join(AUTOMATION_DIR, "execution_trace.jsonl");

interface ExecutionTraceEntry {
  timestamp: string;
  task_id: string;
  action: string;
  status: string;
  cmd?: string;
  exit_code?: number;
  stdout_excerpt?: string;
  stderr_excerpt?: string;
}

function extractString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildTraceEntry(event: TelemetryEvent): ExecutionTraceEntry {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const candidateTaskId =
    extractString(payload.taskId) ?? extractString(payload.task_id);
  const candidateStatus = extractString(payload.status);

  const traceEntry: ExecutionTraceEntry = {
    timestamp: event.timestamp,
    task_id: candidateTaskId ?? "unknown",
    action: event.name,
    status: candidateStatus ?? "unknown"
  };

  const cmd = extractString(payload.cmd) ?? extractString(payload.command);
  const exitCode = extractNumber(payload.exitCode) ?? extractNumber(payload.exit_code);
  const stdoutExcerpt =
    extractString(payload.stdout_excerpt) ?? extractString(payload.stdout);
  const stderrExcerpt =
    extractString(payload.stderr_excerpt) ?? extractString(payload.stderr);

  if (cmd) traceEntry.cmd = cmd;
  if (exitCode !== undefined) traceEntry.exit_code = exitCode;
  if (stdoutExcerpt) traceEntry.stdout_excerpt = stdoutExcerpt;
  if (stderrExcerpt) traceEntry.stderr_excerpt = stderrExcerpt;

  return traceEntry;
}

export interface TelemetryEvent {
  name: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export async function logEvent(name: string, payload?: Record<string, unknown>): Promise<void> {
  const event: TelemetryEvent = {
    name,
    timestamp: new Date().toISOString(),
    payload
  };
  try {
    await fs.mkdir(TELEMETRY_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, `${JSON.stringify(event)}\n`, "utf-8");
  } catch (err) {
    console.warn("Failed to write telemetry event", err);
  }

  try {
    const traceEntry = buildTraceEntry(event);
    await fs.mkdir(AUTOMATION_DIR, { recursive: true });
    await fs.appendFile(TRACE_FILE, `${JSON.stringify(traceEntry)}\n`, "utf-8");
  } catch (err) {
    console.warn("Failed to write execution trace entry", err);
  }
}
