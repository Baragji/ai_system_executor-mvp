import fs from "node:fs/promises";
import path from "node:path";

const TELEMETRY_DIR = path.resolve(".telemetry");
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, "events.log");

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
}
