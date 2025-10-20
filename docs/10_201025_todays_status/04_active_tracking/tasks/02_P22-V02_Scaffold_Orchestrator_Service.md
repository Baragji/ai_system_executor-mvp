# Task Contract — P22-V02: Scaffold orchestrator service

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Ensure services/orchestrator has a minimal Express server with /healthz, problem+json middleware, and validate:all script.

Constraints
- TypeScript/Node.js 20 only. No Python. No new deps unless justified by contract.
- No breaking changes to monolith behavior.
- Keep total changes ≤10 files.

Integration Points (verify and adjust as needed)
- services/orchestrator/src/server.ts — server bootstrap + telemetry + problem details.
- services/orchestrator/src/middleware/problemDetails.ts — RFC 9457 helper wiring.
- services/orchestrator/package.json — scripts: lint, typecheck, test, validate:all.

Steps
1) Discovery-first
   - Confirm healthz route exists and returns {status: "ok"}.
   - Confirm problem details middleware is installed.
   - Confirm validate:all script in services/orchestrator/package.json.
2) Implement/fix gaps (if any)
   - Add missing pieces with minimal scaffolding only.
3) Validate
   - Run per-service validate:all and capture output.

Validation Commands
```bash
cd services/orchestrator
npm run -s lint
npm run -s typecheck
npm -s test -- --coverage
npm run -s validate:all
```

Acceptance Criteria
- /healthz returns 200 with {"status":"ok"}.
- validate:all passes with zero ESLint warnings.
- No new dependencies introduced.

Evidence To Attach
- Command outputs for lint/type/test.
- Screenshots or logs of /healthz response (curl).

Rollback
- Revert any changes in services/orchestrator if validation fails; open a note in .automation/phase22_services_discovery.md describing the failure.

