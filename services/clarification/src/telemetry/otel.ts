import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

let sdk: NodeSDK | null = null;
let started = false;

function getServiceVersion(): string {
  try {
    const pkgPath = resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function getServiceName(): string {
  return process.env.SERVICE_NAME || "executor-service-template";
}

export function isTelemetryEnabled(): boolean {
  return truthy(process.env.OTEL_ENABLED);
}

export function maybeInitTelemetry(): void {
  if (started) return;
  if (!isTelemetryEnabled()) {
    console.log("[OTel] Telemetry disabled (OTEL_ENABLED not set)");
    return;
  }

  try {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

    const traceExporter = new OTLPTraceExporter({
      url: endpoint,
    });

    const serviceName = getServiceName();
    const serviceVersion = getServiceVersion();

    sdk = new NodeSDK({
      traceExporter,
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (req: { url?: string }) => req.url === "/healthz",
        }),
      ],
      resource: defaultResource().merge(
        resourceFromAttributes({
          [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        }),
      ),
    });

    sdk.start();
    started = true;

    console.log(`[OTel] ✅ Initialized for ${serviceName} v${serviceVersion}`);
    console.log(`[OTel] Exporting to ${endpoint}`);
  } catch (error) {
    console.error("[OTel] Failed to initialize telemetry", error);
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) return;

  try {
    console.log("[OTel] Shutting down telemetry...");
    await sdk.shutdown();
    console.log("[OTel] ✅ Telemetry shutdown complete");
  } catch (error) {
    console.error("[OTel] Telemetry shutdown error", error);
  }
}
