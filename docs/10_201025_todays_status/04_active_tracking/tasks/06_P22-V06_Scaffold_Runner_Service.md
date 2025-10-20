# Task Contract — P22-V06: Scaffold runner service

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Ensure services/runner provides Express server, /healthz, problem details, validate:all script.

Constraints
- TS/Node 20 only. No new deps. No breaking changes.

Integration Points
- services/runner/src/server.ts — server bootstrap + /healthz
- services/runner/src/middleware/problemDetails.ts — RFC 9457
- services/runner/package.json — validate:all

Steps
1) Discovery: verify healthz route and middleware are present.
2) Fix gaps minimally if any.
3) Validate service in isolation via validate:all.

Validation Commands
```bash
cd services/runner
npm run -s lint && npm run -s typecheck
npm -s test -- --coverage
npm run -s validate:all
```

Acceptance Criteria
- /healthz returns 200 with {"status":"ok"}.
- validate:all passes with zero lint warnings.

Evidence To Attach
- Lint/type/test outputs.

Rollback
- Revert any changes if validations fail and log in discovery MD.

