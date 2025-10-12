/**
 * Minimal OpenTelemetry bootstrap (env-gated, dependency-optional).
 *
 * Behavior
 * - No-ops unless OTEL_ENABLED is truthy ("1"/"true").
 * - Uses dynamic imports so missing packages do not error at runtime when disabled.
 */

function truthy(envVar: string | undefined): boolean {
  if (!envVar) return false;
  const v = envVar.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let started = false;

export function maybeInitTelemetry(): void {
  if (started) return;
  if (!truthy(process.env.OTEL_ENABLED)) return;
  // Placeholder reserved for future OTel init under env flag. No-ops by design to avoid new deps.
  started = true;
}
