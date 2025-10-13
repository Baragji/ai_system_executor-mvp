/**
 * OpenTelemetry GenAI span tracing for Trust Spine compliance (Phase 19 T0)
 *
 * Behavior:
 * - No-ops unless OTEL_ENABLED is truthy ("1"/"true")
 * - Initializes NodeSDK with OTLP HTTP exporter
 * - Exports traces to OTEL_EXPORTER_OTLP_ENDPOINT (default: http://localhost:4318/v1/traces)
 * - Includes service.name and service.version resource attributes
 * - Supports graceful shutdown via shutdownTelemetry()
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function truthy(envVar: string | undefined): boolean {
  if (!envVar) return false;
  const v = envVar.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

let sdk: NodeSDK | null = null;
let started = false;

/**
 * Get service version from package.json
 */
function getServiceVersion(): string {
  try {
    const pkgPath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function isTelemetryEnabled(): boolean {
  return truthy(process.env.OTEL_ENABLED);
}

/**
 * Initialize OpenTelemetry SDK if OTEL_ENABLED=1
 * Idempotent - safe to call multiple times
 */
export function maybeInitTelemetry(): void {
  if (started) return;
  if (!isTelemetryEnabled()) {
    console.log('[OTel] Telemetry disabled (OTEL_ENABLED not set)');
    return;
  }

  try {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

    // Create OTLP exporter
    const traceExporter = new OTLPTraceExporter({
      url: endpoint,
    });

    // Initialize NodeSDK with service metadata
    sdk = new NodeSDK({
      serviceName: 'executor-mvp',
      traceExporter,
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (req) => {
            // Ignore health check endpoints to reduce noise
            return req.url === '/health' || req.url === '/api/health';
          },
        }),
      ],
    });

    sdk.start();
    started = true;

    console.log(`[OTel] ✅ OpenTelemetry initialized`);
    console.log(`[OTel] Service: executor-mvp v${getServiceVersion()}`);
    console.log(`[OTel] Exporter: ${endpoint}`);
  } catch (error) {
    console.error('[OTel] ERROR: Failed to initialize OpenTelemetry:', error);
    // Don't throw - telemetry failure should not crash the application
  }
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 * Call this on SIGTERM/SIGINT to flush pending spans
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) return;

  try {
    console.log('[OTel] Shutting down OpenTelemetry...');
    await sdk.shutdown();
    console.log('[OTel] ✅ OpenTelemetry shutdown complete');
  } catch (error) {
    console.error('[OTel] ERROR during shutdown:', error);
  }
}
