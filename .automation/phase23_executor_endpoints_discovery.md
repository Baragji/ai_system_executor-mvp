# Refactor Task 28 — Discovery Note: Executor Service Endpoints

Date: 2025-10-26  \
Scope: Extract `/generate` and `/validate` executor operations into the microservice HTTP surface while preserving monolith semantics.

## Integration Points

- `src/executor/outputProcessing.ts`
  - `sanitizeExecutorOutput()` removes unsafe leading path segments and coerces arrays/flags to the ExecutorOutput contract; the endpoint must reuse this helper before any disk writes.
- `src/executor/writeFiles.ts`
  - `writeFiles()` normalizes and guards file paths before persisting; route handler must call it after sanitization to keep security posture identical to the monolith.
- `src/utils/validateFiles.ts`
  - `validateFilesNonEmpty()` powers the plan flow's critical file reconciliation; exposing this via `/validate` keeps orchestrator parity.
- `services/executor/src/server.ts`
  - Central place to register routers. Health routes already mounted, so new executor routers should follow the same pattern as repair service wiring.
- `services/repair/src/routes/repair.ts`
  - Provides the reference pattern for request validation + `respondWithProblem()` usage when arguments are invalid or domain logic throws.

## Observations

- Problem Details middleware is already installed globally; handlers simply need to call `respondWithProblem()` to emit RFC 9457 payloads.
- `sanitizeExecutorOutput()` can still yield payloads missing files; schema validation via `validateExecutorOutput()` should gate disk writes and produce actionable 400 errors.
- `validateFilesNonEmpty()` expects relative paths; handlers should reject absolute paths early to avoid leaking filesystem state.

## Risks

1. Accepting caller-provided project roots without checks could allow writes outside the workspace if upstream validation regresses.
2. Omitting schema validation would let malformed executor payloads slip through, diverging from the monolith flow.
3. Missing error coverage in tests would reduce confidence that Problem Details are returned on invalid input or IO failures.

## Next Steps

1. Define request/response payload types mirroring monolith helpers (raw executor output + enforceTests flag, file validation paths).
2. Implement `services/executor/src/routes/generate.ts` and `services/executor/src/routes/validate.ts` using sanitization, schema validation, and file writes/validations.
3. Add Vitest route tests covering success, validation errors, and internal failure scenarios; ensure Problem Details formatting is asserted.
