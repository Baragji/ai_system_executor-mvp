# Task Contract — P22-V08: Wire monolith → runner service

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Proxy monolith operations to services/runner when RUNNER_URL is set, preserving existing /api/run-tests semantics; add timeouts and sanitized errors.

Constraints
- No breaking API changes. Env-flagged proxy only. No new deps.
- Follow Security Checklist (timeouts, sanitized errors, no secrets in logs).

Integration Points
- src/server.ts — POST /api/run-tests (proxy path already exists; validate hardening)
- .env.example (root) — add RUNNER_URL example if missing

Steps
1) Discovery: verify proxy path correctness and logging for /api/run-tests.
2) Hardening: ensure AbortSignal timeout and problem+json error mapping on upstream failures.
3) Docs: add RUNNER_URL to .env.example and docs/env/README.md if missing.
4) Tests: add test asserting proxy-on behavior wraps upstream errors in problem+json.

Validation Commands
```bash
npm run -s lint && npm run -s typecheck
npm -s test -- tests/runner/proxy.test.ts
npm run -s contract:check
```

Acceptance Criteria
- When RUNNER_URL is set, monolith forwards /api/run-tests to the runner service with sane timeout.
- Errors are sanitized and returned as application/problem+json when enabled.

Evidence To Attach
- Test outputs, updated env docs.

Rollback
- Revert docs/code changes if tests cannot be stabilized within the timebox; note in discovery MD.

