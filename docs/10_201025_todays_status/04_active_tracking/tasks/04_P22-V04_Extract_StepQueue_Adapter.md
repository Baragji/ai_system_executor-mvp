# Task Contract — P22-V04: Extract StepQueue adapter to orchestrator service

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Provide a StepQueue-backed adapter in services/orchestrator to execute the same workflow that the monolith runs locally, keeping monolith path as a proxy when ORCHESTRATOR_URL is configured.

Constraints
- TS/Node 20 only; no new deps; no API changes.
- Monolith remains source of truth when ORCHESTRATOR_URL unset.

Integration Points
- Service: services/orchestrator/src/domain/stepQueueAdapter.ts (create/align)
- Monolith reference: src/orchestrator/stepQueue.ts, src/server.ts (POST /api/execute flow)

Steps
1) Discovery: map minimal interface needed to run a plan or single step in service.
2) Implement adapter using service-local domain; do not import monolith code.
3) Add unit tests for the adapter invoking stubbed domain functions; no network calls.
4) Validate per-service and root tests.

Validation Commands
```bash
cd services/orchestrator
npm -s test -- tests/*.test.ts
cd ../../
npm run -s typecheck && npm run -s lint && npm -s test -- --coverage
```

Acceptance Criteria
- Adapter compiles and tests pass with deterministic, mocked calls.
- No deep imports from monolith (rg for ../../../../src returns 0 in service domain).

Evidence To Attach
- Adapter tests output and source references.

Rollback
- Revert adapter changes if validation fails; document blockers in discovery MD.

