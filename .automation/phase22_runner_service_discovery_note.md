# Phase 22 Discovery Note — REFACTOR-TASK-16: Scaffold Runner Service

Date: 2025-10-19

Scope: Create initial `services/runner` scaffold cloned from the service template (Express + OTel + RFC 9457). No domain logic yet; ensure health endpoint, telemetry hooks, and validate scripts exist.

## Integration Points

- Template Source: `services/_template/README.md` — documents required README sections, scripts, and environment usage for service scaffolds.
- Template Server: `services/_template/src/server.ts` — Express app with `/healthz`, problem details middleware, OTel bootstrap, graceful shutdown.
- Template Middleware: `services/_template/src/middleware/problemDetails.ts` — shared RFC 9457 helpers copied into runner service.
- Template Telemetry: `services/_template/src/telemetry/otel.ts` — OpenTelemetry bootstrap referencing `SERVICE_NAME` env var.
- Template Tests: `services/_template/tests/server.test.ts`, `services/_template/tests/httpClient.test.ts` — baseline Vitest coverage to keep validate:all green post-copy.
- Template Scripts: `services/_template/scripts/run-vitest-with-rollup-shim.mjs` — required shim for per-service Vitest invocation.

## Snippets (±10 lines)

- `services/_template/src/server.ts` (startup + shutdown logic):
```
const server = app.listen(port, () => {
  console.log(`[template] Listening on http://localhost:${port}`);
});

const shutdown = async (signal: ShutdownSignal) => {
  console.log(`[template] Received ${signal}, shutting down...`);
  server.close(async () => {
    await shutdownTelemetry();
    process.exit(0);
  });
};
```

- `services/_template/src/telemetry/otel.ts` (SERVICE_NAME constant):
```
const SERVICE_NAME = process.env.SERVICE_NAME ?? "executor-service-template";
const RESOURCE = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
});
```

- `services/_template/tests/server.test.ts` (health check expectation):
```
const response = await request(app).get("/healthz");
expect(response.status).toBe(200);
expect(response.body).toEqual({ status: "ok" });
```

## Dependencies and Impacts

- Copying template preserves existing dependencies (`express`, `vitest`, `supertest`, `pino`, telemetry packages) already vetted in template `package.json`.
- Need to update package metadata (`name`, `SERVICE_NAME`, port) to match runner service requirements.
- Ensure `.env.example` uses port `3004` per task instructions and README references runner-specific service name.

## Compliance Check (ai-stack.json)

- Language: TypeScript ✅
- Backend: Express ✅
- Telemetry: OpenTelemetry via OTLP ✅
- Problem Details: RFC 9457 middleware ✅
- Testing: Vitest with Supertest ✅
- No forbidden tech introduced ✅

## Justification

- Runner service will host execution steps previously embedded in monolith; starting with template ensures consistent scaffolding and tooling.
- Matching metadata (`@executor/runner-service`, `executor-runner-service`) keeps telemetry and npm namespace aligned with existing services.
- validate:all script ensures lint, typecheck, and tests run consistently before future runner-specific logic lands.
