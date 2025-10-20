# Proposed AGENTS.md Update — Microservices Refactoring Guidance (for PR)

This document captures the exact changes proposed for `AGENTS.md` (protected). Submit these sections via Pull Request for CODEOWNERS review.

## Microservices Refactoring Guidelines

- Extraction sequence per service:
  1) Copy domain modules to `services/<svc>/src/domain`
  2) Fix internal imports to local domain (no `../../../../src/`)
  3) Update routes to consume local domain only
  4) Add/trim dependencies minimally; no network calls in tests
  5) Boot test the service (`/healthz`), keep flags OFF by default

- Decoupling rules:
  - No deep imports from monolith (`../../../../src/`) after extraction
  - Contracts: copy versioned types/interfaces locally or expose stable clients
  - Use narrow interfaces at service boundaries; avoid sharing internal utils

- Feature flags and rollout:
  - Add proxy endpoints guarded by feature flags (default OFF)
  - Wire orchestrator to clients under flags; OFF uses monolith paths
  - Validate both OFF and ON paths with tests; OFF remains the default

## Batch Execution Protocol

- Timebox: 30–45 minutes per batch; ≤10 files changed
- After each batch run: `npm run lint && npm run typecheck && npm test && npm run contract:check`
- Evidence: update discovery notes and link artifacts in docs
- Rollback: if any validation fails, revert the batch and split the scope

## Error Recovery Procedures

1) HALT immediately on failure; do not proceed
2) Capture diagnostics (logs, failing test output)
3) Re-run validations with `--reporter=verbose` for clarity
4) If blocked, split the batch into smaller ones and retry
5) Document recovery steps in the batch plan

## Prohibited Actions (Refactoring Phase)

- No protected file edits without PR and approval
- No new frameworks; no Python
- No breaking API changes; preserve request/response shapes
- No flaky tests; make network calls mock-only in unit tests

---

If approved, integrate these sections into `AGENTS.md` under a new heading: “Refactoring (Phase 21) Guidelines”.

