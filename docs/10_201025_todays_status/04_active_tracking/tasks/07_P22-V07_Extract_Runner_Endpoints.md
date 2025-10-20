# Task Contract — P22-V07: Extract runner endpoints (run/install/test)

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Ensure services/runner exposes POST /run, /install, /test and wires to local domain functions with deterministic tests.

Constraints
- TS/Node 20 only. No network in unit tests. No API changes to monolith.

Integration Points
- services/runner/src/routes/run.ts, install.ts, test.ts — implement/align
- services/runner/src/domain/runner.ts — domain wrappers
- services/runner/tests/server.test.ts — endpoint tests

Steps
1) Discovery: confirm routes exist and map to domain stubs.
2) Implement missing route handlers using domain wrappers; avoid monolith imports.
3) Add unit tests for each route with deterministic behavior (mocks only).
4) Validate per-service tests and coverage.

Validation Commands
```bash
cd services/runner
npm -s test -- tests/server.test.ts
cd ../../
npm run -s contract:check
```

Acceptance Criteria
- All three endpoints return 200 on happy paths in tests.
- No deep imports from monolith; services-only code.

Evidence To Attach
- Test outputs and relevant diffs.

Rollback
- Revert route changes if tests cannot be stabilized within the timebox; note gaps in discovery MD.

