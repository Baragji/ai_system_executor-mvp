# Task Contract — P22-V05: Wire monolith → orchestrator service

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Add ORCHESTRATOR_URL env to monolith (if missing) and proxy POST /api/execute and GET /api/executions/:id to services/orchestrator when set; keep StepQueue fallback default.

Constraints
- No breaking API changes. Feature-flag via env only. No new deps.
- Follow problem+json and Security Checklist.

Integration Points
- src/server.ts — POST /api/execute (already supports proxying; validate and harden), GET /api/executions/:id proxy logic.
- .env.example (root) — add ORCHESTRATOR_URL example.

Steps
1) Discovery: verify current proxy code paths and health probes for ORCHESTRATOR_URL.
2) Hardening: ensure timeouts, accept headers, and sanitized errors (problem+json) per Security Checklist.
3) Docs: add ORCHESTRATOR_URL to .env.example and docs/env/README.md if missing.
4) Tests: add or update tests to assert proxy on/off behavior.

Validation Commands
```bash
npm run -s lint && npm run -s typecheck
npm -s test -- tests/orchestrator/executions.test.ts
npm run -s contract:check
```

Acceptance Criteria
- Monolith proxies to service when ORCHESTRATOR_URL is set; falls back otherwise.
- Tests pass; no warnings; coverage thresholds hold.

Evidence To Attach
- Test outputs and diff summary.

Rollback
- Revert .env.example changes if needed; do not leave partial proxy paths.

