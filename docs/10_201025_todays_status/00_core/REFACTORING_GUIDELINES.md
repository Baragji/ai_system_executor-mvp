% Refactoring Guidelines (Microservices Extraction)

Purpose: Define the exact, CDI-compliant patterns agents must follow during refactoring. These rules are refactoring-specific and complement universal repository policy in `AGENTS.md`.

## Principles
- Default safe: feature flags OFF; monolith behavior unchanged
- Change in small, reversible steps (30–45 minutes, ≤10 files)
- Validate after every batch: `lint`, `typecheck`, `test`, `contract:check`
- No protected file edits without a PR
- No new dependencies without explicit justification in contracts/ADR

## Service Extraction Pattern (5 steps)
1) Copy domain modules
- Copy from `src/<domain>/...` to `services/<svc>/src/domain/...`
- Keep file structure; avoid cross-domain leakage
2) Fix internal imports
- Replace any `../../../../src/...` with local domain imports
- Ensure no deep imports remain in copied files
3) Update routes
- Wire service routes to local domain functions only
- Preserve API shapes; add tests for route behavior
4) Dependencies audit
- Minimize runtime deps; pin versions
- Ensure unit tests use mocks (no network)
5) Boot test
- Start the service and verify `/healthz`
- Keep feature flags OFF; ensure monolith unaffected

## Proxy Implementation Pattern (5 steps)
1) Client skeleton
- Create typed client for the service (no network in tests)
2) Feature flag guard
- Introduce flag in orchestrator/planning to switch to the client path
- Default OFF, OFF path unchanged
3) Env/docs
- Document required env vars and flag usage
4) Tests
- Unit tests for client and proxy logic (deterministic mocks)
5) Integration test
- End-to-end behind the flag; deterministic; no external calls

## Batch Execution Rules
- Before: confirm batch ≤45 min and ≤10 files, identify validations
- During: make focused changes only; keep diffs small
- After: run `lint`, `typecheck`, `test`, `contract:check`; attach evidence if required
- If any step fails: HALT, revert batch, split into smaller batches

## Validation Sequence (each batch)
- `npm run -s lint`
- `npm run -s typecheck`
- `npm -s test` (≥80% line, ≥75% branch)
- `npm run -s contract:check`

## Prohibited Actions
- Do not edit protected files directly (CODEOWNERS-gated)
- Do not introduce frontend frameworks or Python
- Do not change API request/response shapes
- Do not add network calls in unit tests

## Rollback Triggers
- Validation failure (lint/type/tests/contracts)
- Coverage regressions below thresholds
- API shape drift or feature flag default behavior change

## Common Errors & Fixes
- Deep imports remain: search `../../../../src/` and replace with local domain
- Missing type exports: export types from local domain index or module
- Flaky tests from timers/network: use deterministic mocks and fake timers
- Env mismatch: ensure `.env.example` and docs list required variables

## References
- Progress tracker: `.automation/refactor_progress.md`
- Batches plan: `docs/10_201025_todays_status/00_core/batches_plan.md`
- Dependency matrix: `docs/10_201025_todays_status/00_core/dependency_matrix.md`
- Repository policy: `AGENTS.md`

