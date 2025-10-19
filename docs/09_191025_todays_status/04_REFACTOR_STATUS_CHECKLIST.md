# Microservice Refactor Status

This checklist tracks the end-to-end microservice refactor with concrete outcomes, validations, and dependencies. Each task is time-boxed to 30–45 minutes and validated before and after execution.

Repository metrics (baseline, 2025-10-19):
- Total LOC (src): 12,617
- .ts files: 75
- Largest file: src/server.ts (2,404 LOC)
- Cross-module imports: 66
- Test count: 98
- Test runtime: 10.53s

Target (post-refactor):
- Each service < 2,000 LOC, largest file < 500 LOC
- Per-service tests < 30s
- Technical Debt Index per service ≈ 75

---

## Phase 1: Service Extraction (Week 1–2)

### Infrastructure Setup
- [x] Task: Setup service templates (Express + OTel + RFC 9457)
  - Expected Outcome: `services/_template/` boots with `npm start`, returns health and problem+json errors
  - Validation:
    - `node -e "console.log(process.version)"`
    - `ls -la services/_template && node -e "process.exit(0)"`
    - `cd services/_template && npm start & sleep 2 && curl -sfS http://localhost:3999/healthz`
  - Depends on: None

- [x] Task: Setup inter-service HTTP client with correlation IDs
  - Expected Outcome: Shared http client emits `x-correlation-id`, logs OTel trace IDs
  - Validation:
    - `rg -n "x-correlation-id" services/_template`
    - `rg -n "traceparent|tracestate" services/_template`
  - Depends on: Service templates

- [ ] Task: Setup per-service CI/CD pipeline (local) 
  - Expected Outcome: `npm run validate:all` per service (lint+type+tests) passes
  - Validation:
    - `cd services/_template && npm run validate:all`
  - Depends on: Service templates

- [ ] Task: Setup service discovery (dev) 
  - Expected Outcome: `.env` + docs declare local ports; services reach each other via http://localhost:PORT
  - Validation:
    - `rg -n "PORT=" services/*/.env.example`
  - Depends on: Service templates

### llm-gateway-service Extraction
- [ ] Task: Extract LLM provider interfaces (src/llm/index.ts)
  - Expected Outcome: `services/llm-gateway` exposes POST /complete using current provider API
  - Validation: `curl -sfS -X POST http://localhost:3006/complete -d '{"messages":[]}' -H 'content-type: application/json'`
  - Depends on: Infra tasks 1–2

- [ ] Task: Extract OpenAI provider (src/llm/providers/openai.ts)
  - Expected Outcome: Provider code moved; monolith imports switched to gateway
  - Validation: `rg -n "providers/openai" -g '!services' && rg -n "/complete" services/llm-gateway`
  - Depends on: Prior task

- [ ] Task: Extract retry logic and telemetry
  - Expected Outcome: Retry/backoff + telemetry live in llm-gateway
  - Validation: `rg -n "llm_retry|llm_provider_" services/llm-gateway`
  - Depends on: Prior task

- [ ] Task: Setup service API endpoints
  - Expected Outcome: /complete, /stream, /healthz implemented
  - Validation: `curl -sfS http://localhost:3006/healthz`
  - Depends on: Prior task

- [ ] Task: Wire monolith to call llm-gateway-service
  - Expected Outcome: Monolith no longer calls SDK directly
  - Validation: `rg -n "openai" src/llm | wc -l` (goes down), `rg -n "http://localhost:3006/complete" src`
  - Depends on: Endpoints

- [ ] Task: Migrate tests and validate
  - Expected Outcome: Per-service tests pass; monolith tests still green
  - Validation: `cd services/llm-gateway && npm test && cd ../../ && npm test`
  - Depends on: Wiring

### runner-service Extraction
- [ ] Task: Extract sandbox execution logic (src/runner/)
  - Expected Outcome: `services/runner` exposes POST /run
  - Validation: `curl -sfS -X POST http://localhost:3004/run -H 'content-type: application/json' -d '{}'`
  - Depends on: Infra tasks

- [ ] Task: Extract dependency installation
  - Expected Outcome: POST /install endpoint
  - Validation: `curl -sfS -X POST http://localhost:3004/install -H 'content-type: application/json' -d '{}'`
  - Depends on: Runner extraction

- [ ] Task: Extract test runner logic
  - Expected Outcome: POST /test endpoint
  - Validation: `curl -sfS -X POST http://localhost:3004/test -H 'content-type: application/json' -d '{}'`
  - Depends on: Runner extraction

- [ ] Task: Setup service API endpoints
  - Expected Outcome: /run, /install, /test, /healthz
  - Validation: `curl -sfS http://localhost:3004/healthz`
  - Depends on: Prior tasks

- [ ] Task: Wire monolith and migrate tests
  - Expected Outcome: Monolith proxies to runner; tests pass
  - Validation: `npm test`
  - Depends on: Endpoints

### orchestrator-service Extraction
- [ ] Task: Extract StepQueue (src/orchestrator/stepQueue.ts)
  - Expected Outcome: `services/orchestrator` exposes queue endpoints
  - Validation: `rg -n "class StepQueue" services/orchestrator`
  - Depends on: Infra

- [ ] Task: Extract LangGraph integration (src/orchestrator/graph.ts)
  - Expected Outcome: /execute uses StateGraph in service
  - Validation: `curl -sfS -X POST http://localhost:3005/execute -H 'content-type: application/json' -d '{"prompt":"ping"}'`
  - Depends on: StepQueue

- [ ] Task: Extract checkpoints and state management
  - Expected Outcome: Checkpoint store lives in orchestrator
  - Validation: `rg -n "checkpoint" services/orchestrator`
  - Depends on: Graph extraction

- [ ] Task: Extract interrupt/pause/resume logic
  - Expected Outcome: /pause, /resume endpoints
  - Validation: `rg -n "pause|resume" services/orchestrator && curl -sfS http://localhost:3005/healthz`
  - Depends on: Graph + checkpoints

- [ ] Task: Setup service API endpoints
  - Expected Outcome: /execute, /status/:id, /pause, /resume, /healthz
  - Validation: `curl -sfS http://localhost:3005/healthz`
  - Depends on: Prior tasks

- [ ] Task: Wire UI to orchestrator-service
  - Expected Outcome: Monolith routes /api/execute via orchestrator-service
  - Validation: `curl -sfS -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"prompt":"ok"}'`
  - Depends on: Endpoints

- [ ] Task: Migrate all orchestration tests
  - Expected Outcome: tests/orchestrator/* pass at service, monolith tests green
  - Validation: `cd services/orchestrator && npm test && cd ../../ && npm test`
  - Depends on: Wiring

- [ ] Task: Validate end-to-end flow
  - Expected Outcome: /api/execute returns 202 + Location; polling completes
  - Validation: `npm test tests/api/executions.test.ts`
  - Depends on: Wiring

---

## Phase 2: Domain Services (Week 3–4)

- [ ] Task 21: Remaining services extraction — discovery
  - Expected Outcome: `.automation/phase23_services_discovery.json` lists integration points and endpoints for planning/repair/executor/clarification
  - Validation: `test -f .automation/phase23_services_discovery.json`

- [ ] Task 22: Scaffold planning service
  - Expected Outcome: `services/planning` boots; /healthz returns ok; validate:all passes
  - Validation: `cd services/planning && npm run validate:all`

- [ ] Task 23: Extract planning endpoints (/decompose, /execute-plan)
  - Expected Outcome: Routes live and tested
  - Validation: `cd services/planning && npm run validate:all`

- [ ] Task 24: Wire monolith → planning (PLANNING_URL)
  - Expected Outcome: Monolith proxies planning calls when env set
  - Validation: `vitest run tests/planning/*.test.ts`

- [ ] Task 25: Scaffold repair service
  - Expected Outcome: `services/repair` boots; validate:all passes
  - Validation: `cd services/repair && npm run validate:all`

- [ ] Task 26: Extract repair endpoints (/analyze, /repair)
  - Expected Outcome: Routes live and tested
  - Validation: `cd services/repair && npm run validate:all`

- [ ] Task 27: Scaffold executor service
  - Expected Outcome: `services/executor` boots; validate:all passes
  - Validation: `cd services/executor && npm run validate:all`

- [ ] Task 28: Extract executor endpoints (/generate, /validate)
  - Expected Outcome: Routes live and tested
  - Validation: `cd services/executor && npm run validate:all`

- [ ] Task 29: Scaffold clarification service + /clarify
  - Expected Outcome: `services/clarification` boots; /clarify implemented
  - Validation: `cd services/clarification && npm run validate:all`

- [ ] Task 30: Parity validation + CI/QA + docs (all domain services)
  - Expected Outcome: All services pass validate:all; root suite passes without global proxies; proxy tests pass in isolation; docs updated
  - Validation: `npm run validate:all`

---

## Phase 3: Supporting Services (Week 5)

- Clarification, Telemetry, UI-BFF extracted last.
- Validation:
  - `cd services/[service] && npm run validate:all`
  - Centralized traces visible; problem+json enforced.

---

## Dependencies Overview
- Infra → llm-gateway/runner/orchestrator
- llm-gateway before orchestrator LangGraph live testing
- runner before orchestrator test paths
- Orchestrator wiring before UI integration
