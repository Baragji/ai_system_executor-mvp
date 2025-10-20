# Revised Refactoring Batches Plan (~53 batches)

Timebox: 30–45 minutes per batch. Max 10 files per batch. Run validations after every batch: `lint`, `typecheck`, `test`, `contract:check`. Feature flags remain OFF by default; monolith must remain functional at all times.

Legend: Each batch lists Goal, Files to touch, Validate, Accept, Rollback.

## 0) Discovery

- Batch 0 — Services Discovery (30 min)
  - Goal: Capture deep imports, env vars, deps, routes, risk
  - Files: `.automation/refactor_services_discovery.{md,json}`
  - Validate: artifacts exist; grep evidence included
  - Accept: all services covered; stack compliance confirmed
  - Rollback: adjust artifacts and re-run validations (no code changes)

## 1) Validation & Tooling

- Batch 1a — Validation scripts (services) (30 min)
  - Goal: Ensure each service `validate:all` runs locally
  - Files: `services/*/package.json`, `services/*/scripts/*`
  - Validate: `npm run -w services/<svc> validate:all` passes
  - Accept: no warnings; tests green
  - Rollback: revert script changes per service

- Batch 1b — Validation scripts (root) (30 min)
  - Goal: Confirm root `validate:all` orchestrates checks
  - Files: `package.json`, `scripts/*`
  - Validate: `npm run validate:all` passes
  - Accept: CI-equivalent checks reproducible locally
  - Rollback: revert to previous script versions

## 2) Docs & Env

- Batch 2a — Discovery Docs Index (30 min)
  - Goal: Link artifacts and status in docs index
  - Files: `docs/10_201025_todays_status/*`
  - Validate: links resolve; CI markdown lints clean
  - Accept: discoverability improved
  - Rollback: remove links

- Batch 2b — Service .env templates (30 min)
  - Goal: Ensure minimal `.env.example` for each service
  - Files: `services/*/.env.example`
  - Validate: service boots with defaults
  - Accept: documented required vars per service
  - Rollback: delete templates

- Batch 2c — Env docs consolidation (30 min)
  - Goal: Central doc for env vars and flags
  - Files: `docs/env/README.md`
  - Validate: lists vars; maps to services
  - Accept: single source of truth
  - Rollback: remove doc

## 3) LLM Gateway — Extraction

- Batch 3a — LLM: Copy domain modules (30 min)
  - Goal: copy `src/llm/*` to `services/llm-gateway/src/domain/*`
  - Files: ≤10 files per pass
  - Validate: files exist; typecheck service
  - Accept: no deep imports in copied files
  - Rollback: remove copied files

- Batch 3b — LLM: Fix internal imports (30–45 min)
  - Goal: adjust relative imports to local domain
  - Files: domain files only
  - Validate: typecheck service
  - Accept: no `../../../../src/` references
  - Rollback: revert changes

- Batch 3c — LLM: Update routes to use domain (30 min)
  - Goal: wire routes to local providers/domain
  - Files: `services/llm-gateway/src/routes/*`
  - Validate: unit tests; mock OpenAI
  - Accept: endpoints return expected shapes
  - Rollback: restore route bindings

- Batch 3d — LLM: Dependencies audit (30 min)
  - Goal: ensure `openai` pinned and mocked in tests
  - Files: `services/llm-gateway/package.json`, tests
  - Validate: tests green offline
  - Accept: no network in tests
  - Rollback: revert package.json

- Batch 3e — LLM: Boot test (30 min)
  - Goal: start service locally; smoke tests
  - Files: none (runtime only)
  - Validate: `/healthz` OK
  - Accept: no regressions with flags OFF
  - Rollback: n/a

## 4) Planning — Extraction

- Batch 4a — Planning: Copy core modules (45 min)
  - Goal: copy `src/planning/*` to service domain
  - Files: ≤10 files per pass
  - Validate: typecheck planning service
  - Accept: no deep imports remain in copied set
  - Rollback: remove copied set

- Batch 4b — Planning: Support utils (30–45 min)
  - Goal: copy needed `src/utils/*`, `src/fixtures/*`
  - Files: ≤10 files
  - Validate: typecheck
  - Accept: imports localized
  - Rollback: revert copies

- Batch 4c — Planning: Runner/Repair boundaries (30–45 min)
  - Goal: define service interfaces (no monolith reach-in)
  - Files: service domain interfaces
  - Validate: compile stubs; unit tests
  - Accept: replace deep imports with interfaces
  - Rollback: restore imports

- Batch 4d — Planning: Routes update (30 min)
  - Goal: wire `/decompose`, `/execute-plan` to domain
  - Files: routes only
  - Validate: endpoint tests
  - Accept: shapes unchanged
  - Rollback: revert routes

- Batch 4e — Planning: Boot test (30 min)
  - Goal: start service; smoke flows
  - Files: none
  - Validate: `/healthz` OK
  - Accept: flags OFF safe
  - Rollback: n/a

## 5) Repair — Extraction

- Batch 5a — Repair: Copy domain modules (30–45 min)
  - Goal: copy `src/repair/*` to service domain
  - Files: ≤10 files
  - Validate: typecheck
  - Accept: no deep imports in copied set
  - Rollback: remove copies

- Batch 5b — Repair: Contracts decoupling (30–45 min)
  - Goal: copy or version contracts locally
  - Files: service contracts folder
  - Validate: tests compile
  - Accept: no monolith contract imports
  - Rollback: revert

- Batch 5c — Repair: Route wiring (30 min)
  - Goal: wire `/repair`, `/analyze` to domain
  - Files: routes only
  - Validate: endpoint tests
  - Accept: shapes unchanged
  - Rollback: revert routes

- Batch 5d — Repair: Dependencies audit (30 min)
  - Goal: ensure runtime deps minimal
  - Files: package.json
  - Validate: tests; coverage ok
  - Accept: no warnings
  - Rollback: revert

- Batch 5e — Repair: Boot test (30 min)
  - Goal: start service; smoke
  - Files: none
  - Validate: `/healthz` OK
  - Accept: flags OFF safe
  - Rollback: n/a

## 6) Runner — Extraction

- Batch 6a — Runner: Copy domain modules (30–45 min)
  - Goal: copy `src/runner/*` to service domain
  - Files: ≤10 files
  - Validate: typecheck
  - Accept: imports localized
  - Rollback: remove copies

- Batch 6b — Runner: Telemetry/events (30 min)
  - Goal: copy event logging helpers
  - Files: telemetry files
  - Validate: typecheck
  - Accept: no deep imports
  - Rollback: revert

- Batch 6c — Runner: Routes wiring (30 min)
  - Goal: wire `/run`, `/test`, `/install`
  - Files: routes only
  - Validate: endpoint tests
  - Accept: shapes unchanged
  - Rollback: revert

- Batch 6d — Runner: Dependency audit (30 min)
  - Goal: minimize deps; pin versions
  - Files: package.json
  - Validate: tests; coverage
  - Accept: green build
  - Rollback: revert

- Batch 6e — Runner: Boot test (30 min)
  - Goal: start service; smoke
  - Files: none
  - Validate: `/healthz` OK
  - Accept: flags OFF safe
  - Rollback: n/a

## 7) LLM Gateway — Proxy & Feature Flag

- Batch 7a — LLM Proxy skeleton (30 min)
  - Goal: add proxy endpoints guarded by feature flag
  - Files: routes, config flag
  - Validate: proxy on/off behavior
  - Accept: default OFF unaffected
  - Rollback: remove proxy

- Batch 7b — LLM Client lib (30 min)
  - Goal: small client for orchestrator/planning
  - Files: `/clients/llm-gateway.ts`
  - Validate: unit tests; no network
  - Accept: typed responses
  - Rollback: revert

- Batch 7c — LLM Env/docs (30 min)
  - Goal: document flags/env for LLM
  - Files: service README, env doc
  - Validate: docs linked
  - Accept: clear rollout path
  - Rollback: revert

- Batch 7d — LLM Tests (30–45 min)
  - Goal: add integration tests behind flag
  - Files: tests/
  - Validate: coverage thresholds met
  - Accept: ≥80% line / 75% branch
  - Rollback: mark flaky and split

- Batch 7e — LLM Integration test (30–45 min)
  - Goal: end-to-end without network
  - Files: tests/
  - Validate: deterministic mocks
  - Accept: green
  - Rollback: skip and split

## 8) Planning — Proxy & Feature Flag

- Batch 8a — Planning Proxy skeleton (30 min)
  - Goal: orchestrate subcalls via proxy flag
  - Files: routes, flag
  - Validate: off-path no changes
  - Accept: default OFF
  - Rollback: remove proxy

- Batch 8b — Planning Client lib (30 min)
  - Goal: typed client for orchestrator
  - Files: `/clients/planning.ts`
  - Validate: unit tests
  - Accept: typed responses
  - Rollback: revert

- Batch 8c — Planning Env/docs (30 min)
  - Goal: docs + examples
  - Files: docs
  - Validate: links resolve
  - Accept: clear guidance
  - Rollback: revert

- Batch 8d — Planning Tests (45 min)
  - Goal: endpoint + domain tests
  - Files: tests/
  - Validate: coverage ok
  - Accept: thresholds met
  - Rollback: split

- Batch 8e — Planning Integration test (45 min)
  - Goal: plan → runner stub pathway
  - Files: tests/
  - Validate: deterministic
  - Accept: green
  - Rollback: isolate

## 9) Repair — Proxy & Feature Flag

- Batch 9a — Repair Proxy skeleton (30 min)
  - Goal: proxy `/repair` under flag
  - Files: routes, flag
  - Validate: OFF safe
  - Accept: unchanged defaults
  - Rollback: remove proxy

- Batch 9b — Repair Client lib (30 min)
  - Goal: typed client for orchestrator
  - Files: `/clients/repair.ts`
  - Validate: unit tests
  - Accept: typed responses
  - Rollback: revert

- Batch 9c — Repair Env/docs (30 min)
  - Goal: docs + examples
  - Files: docs
  - Validate: links resolve
  - Accept: clear guidance
  - Rollback: revert

- Batch 9d — Repair Tests (45 min)
  - Goal: endpoint + domain tests
  - Files: tests/
  - Validate: coverage ok
  - Accept: thresholds met
  - Rollback: split

- Batch 9e — Repair Integration test (45 min)
  - Goal: repair loop with mocks
  - Files: tests/
  - Validate: deterministic
  - Accept: green
  - Rollback: isolate

## 10) Runner — Proxy & Feature Flag

- Batch 10a — Runner Proxy skeleton (30 min)
  - Goal: proxy `/run` under flag
  - Files: routes, flag
  - Validate: OFF safe
  - Accept: unchanged defaults
  - Rollback: remove proxy

- Batch 10b — Runner Client lib (30 min)
  - Goal: typed client for orchestrator/planning
  - Files: `/clients/runner.ts`
  - Validate: unit tests
  - Accept: typed responses
  - Rollback: revert

- Batch 10c — Runner Env/docs (30 min)
  - Goal: docs + examples
  - Files: docs
  - Validate: links resolve
  - Accept: clear guidance
  - Rollback: revert

- Batch 10d — Runner Tests (45 min)
  - Goal: endpoint + domain tests
  - Files: tests/
  - Validate: coverage ok
  - Accept: thresholds met
  - Rollback: split

- Batch 10e — Runner Integration test (45 min)
  - Goal: run/install flows with mocks
  - Files: tests/
  - Validate: deterministic
  - Accept: green
  - Rollback: isolate

## 11) Orchestrator — Integration

- Batch 11a — Orchestrator: Client wiring (30–45 min)
  - Goal: use service clients behind flag
  - Files: orchestrator domain
  - Validate: typecheck
  - Accept: flag OFF → monolith; ON → services
  - Rollback: revert client calls

- Batch 11b — Orchestrator: Error paths (30 min)
  - Goal: problem-details propagation
  - Files: middleware
  - Validate: tests
  - Accept: RFC9457 format under PROBLEM_DETAILS_ENABLED
  - Rollback: revert

- Batch 11c — Orchestrator: Boot + E2E smoke (45 min)
  - Goal: happy-path execute via flags
  - Files: tests
  - Validate: green
  - Accept: no regressions
  - Rollback: disable flags

## 12) Executor — Integration

- Batch 12a — Executor: Client wiring (30 min)
  - Goal: call executor service behind flag
  - Files: orchestrator domain
  - Validate: unit tests
  - Accept: shapes unchanged
  - Rollback: revert

- Batch 12b — Executor: E2E smoke (30–45 min)
  - Goal: plan → executor write path
  - Files: tests
  - Validate: deterministic
  - Accept: green
  - Rollback: disable flag

## 13) Clarification — Integration

- Batch 13a — Clarification: Client wiring (30 min)
  - Goal: call clarification service behind flag
  - Files: orchestrator/planning domain
  - Validate: unit tests
  - Accept: shapes unchanged
  - Rollback: revert

- Batch 13b — Clarification: E2E smoke (30–45 min)
  - Goal: clarify → plan flow
  - Files: tests
  - Validate: deterministic
  - Accept: green
  - Rollback: disable flag

---

Global Validations (run before completing Priority 1):
- `npm run -s lint`
- `npm run -s typecheck`
- `npm -s test` (≥80% line / ≥75% branch)
- `npm run -s contract:check`

