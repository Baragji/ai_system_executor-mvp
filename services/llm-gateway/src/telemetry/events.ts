export interface TelemetryEvent {
  name: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

// Minimal local telemetry helper to avoid cross-repo imports.
// Writes to console only; can be expanded later to JSONL if needed.
export async function logEvent(name: string, payload?: Record<string, unknown>): Promise<void> {
  try {
    const event: TelemetryEvent = { name, timestamp: new Date().toISOString(), payload };
    // Keep it lightweight to avoid side effects in tests
    if (process.env.LLM_GATEWAY_LOG_EVENTS) {
      console.log("[llm-gateway] event", JSON.stringify(event));
    }
  } catch {
    // no-op
  }
}
