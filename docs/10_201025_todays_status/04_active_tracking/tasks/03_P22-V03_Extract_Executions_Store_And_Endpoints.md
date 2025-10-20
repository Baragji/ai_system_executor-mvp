# Task Contract — P22-V03: Extract executions store and endpoints

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Ensure services/orchestrator exposes POST /execute (202 + Location) and GET /executions/:id backed by an in-memory store; maintain API parity with monolith semantics.

Constraints
- TS/Node 20 only. No new deps. No breaking API changes.
- Use RFC 9457 responses on errors when PROBLEM_DETAILS_ENABLED.

Integration Points
- Service: services/orchestrator/src/routes/execute.ts, services/orchestrator/src/routes/executions.ts, services/orchestrator/src/domain/executionsStore.ts
- Monolith: src/server.ts — behavior reference for 202 + Location + polling

Steps
1) Discovery: confirm the service store and routes exist; map functions and shapes to monolith reference paths.
2) Implement/align: add or adjust store and routes to align with monolith Location + polling pattern.
3) Tests: add/update services/orchestrator/tests/executeRoutes.test.ts to validate 202 + Location + GET status polling.
4) Validate: run per-service tests and root contract checks.

Validation Commands
```bash
cd services/orchestrator
npm -s test -- tests/executeRoutes.test.ts
cd ../../
npm run -s contract:check
```

Acceptance Criteria
- POST /execute returns 202 and a Location header pointing to /executions/:id.
- GET /executions/:id returns status payload; shapes align with monolith.
- Tests green; coverage thresholds hold.

Evidence To Attach
- Test output and snippets of request/response shapes.

Rollback
- If parity is not achieved without warnings, revert service changes and file a note in discovery MD.

