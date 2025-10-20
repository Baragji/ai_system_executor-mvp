# Task Contract — P22-V01: Map orchestrator extraction points

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Discovery-first mapping of exact integration points for orchestrator extraction and monolith proxying.

Constraints
- TypeScript/Node.js 20 only. No Python. No new dependencies.
- No breaking API changes. Feature flags OFF by default.
- Keep changes ≤10 files, ≤45 minutes. Halt on any failure.

What To Deliver
1) Discovery artifacts:
   - .automation/phase22_services_discovery.json
   - .automation/phase22_services_discovery.md
2) Exact file:line:function references for orchestrator extraction/proxy points.
3) Stack compliance check (ai-stack.json). No forbidden tech.

Scope — Identify and record
- Monolith orchestrator call sites and feature-flag branches:
  - src/server.ts — POST /api/execute (flag routing + 202 Location + polling)
  - src/orchestrator/*.ts — stepQueue, graph, executionsStore
- Service-side orchestrator scaffolding and routes:
  - services/orchestrator/src/server.ts
  - services/orchestrator/src/routes/*.ts
  - services/orchestrator/src/domain/*.ts

Procedure (Discovery-First)
1) Scan files for integration points and deep links
   - rg -n "POST /api/execute|/api/executions|AGENTS_RUNTIME|ORCHESTRATOR_URL" src
   - rg -n "healthz|execute|executions" services/orchestrator/src
2) Capture snippets (±10 lines) for each integration point into the MD artifact.
3) Map API shapes (request/response, 202 + Location + polling) and confirm parity across monolith and service.
4) Record risks, assumptions (should be none), and flag defaults.
5) Validate stack compliance against ai-stack.json.

Validation Commands
```bash
# files exist
ls -la .automation/phase22_services_discovery.json
ls -la .automation/phase22_services_discovery.md

# schema and repo validations
npm run -s lint
npm run -s typecheck
npm -s test -- --coverage
npm run -s contract:check
```

Acceptance Criteria
- Discovery JSON/MD created with file:line:function references and code snippets.
- No policy violations (stack, lint, types, contracts).
- Risks and rollback notes captured in the MD.

Evidence To Attach
- .automation/phase22_services_discovery.json
- .automation/phase22_services_discovery.md

Rollback
- Discovery is read-only. If scans find mismatches, update artifacts and re-validate.

