# Phase 23 Executor Service Discovery

- **Task**: REFACTOR-TASK-27 – Scaffold executor service from template
- **Date**: 2025-10-19
- **Scope**: Create `services/executor` microservice using existing template conventions (Express, OpenTelemetry bootstrap, RFC 9457 problem handling).

## Integration Points
1. `services/_template/src/index.ts` – Entry point sets up telemetry before starting Express server. Executor service will keep identical boot order to preserve observability.
2. `services/_template/src/server.ts` – Provides `/healthz` route and error middleware baseline. Ensures new service exposes same health check contract returning `{ "status": "ok" }`.
3. `services/_template/scripts/bootstrap-otel.ts` – Initializes OpenTelemetry. Confirmed script is imported in `src/index.ts`; no changes required beyond copy.
4. `services/_template/README.md` – Contains service metadata placeholders (`SERVICE_NAME=template-service`, references to `service-template`). These need renaming to `executor-executor-service` for clarity and automation compatibility.
5. `services/_template/package.json` – Contains package name `@executor/service-template` and script names used by CI; rename to `@executor/executor-service` while retaining scripts.
6. `services/_template/.env.example` – Default port 3999. Requirement states executor should run on 3001.

## Dependencies & Compliance Check
- Node.js 20, Express 4, OpenTelemetry libs already approved by stack.
- No new npm dependencies introduced beyond template.
- Maintains RFC 9457 problem-details support through copied middleware (`respondWithProblem`).
- Validate using `npm run validate:all` inside new service directory per template instructions.

## Risks / Considerations
- Ensure `sed` replacements are compatible with GNU sed (use `sed -i` without BSD syntax).
- After copy, verify README instructions don't reference template placeholders.
- Running `npm install` should not be required; template dependencies already captured via copy of `package-lock.json`.
- Confirm `/healthz` route is reachable once server started on port 3001.

