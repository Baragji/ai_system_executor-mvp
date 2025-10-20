# Priority 3 — NICE TO HAVE (Enhancements)

Goal: Improve developer velocity and safety with templates, parallelization guidance, performance baselines, and a lightweight security checklist.

Scope (complete as capacity allows):
- Provide reusable batch templates
- Document safe parallel execution
- Capture baseline performance and guard against regressions
- Add a security checklist for service proxies

---

## 1) Batch Templates Library

Deliverables:
- docs/10_201025_todays_status/templates/batch_templates.md

Include the following templates (copy/paste ready):

### Template A — Service Extraction (per service, 5 batches)
1) Copy domain modules (30 min)
- Files to touch: src/<domain> → services/<service>/src/domain
- Validations: files exist; no unrelated changes in git diff
- Accept: TS typecheck passes in service

2) Fix internal imports (30 min)
- Files to touch: only copied domain files
- Validations: service typecheck passes
- Accept: no new errors introduced

3) Update service routes (30 min)
- Files to touch: service route files only
- Validations: grep confirms no ../../../../src/ remains in service
- Accept: route compiles

4) Add deps (30 min)
- Files to touch: service package.json
- Validations: npm install succeeds
- Accept: lockfile updates committed

5) Boot test (30 min)
- Actions: npm start; curl /healthz
- Accept: HTTP 200 OK; logs clean

### Template B — Proxy Integration (per service, 5 batches)
1) Client skeleton (30 min) → new client file in monolith
2) Feature flag guard (30 min) → USE_<SERVICE> flag default false
3) Env/docs (20–30 min) → .env.example updates + docs
4) Unit tests (45 min) → mock client and success/error paths
5) Integration test (30 min) → run service + monolith with flag=true

Acceptance criteria (templates):
- [ ] Template file exists and covers both patterns with checklists

---

## 2) Parallel Execution Guide

Deliverables:
- docs/10_201025_todays_status/parallel_execution_guide.md

Include:
- Which batches can run concurrently (e.g., 3a–3e for Planning can run parallel to 5a–5e for Repair)
- Branching strategy: one batch per branch; name: batch-<N>-<service>-<action>
- Merge strategy: only after full validation checks + human sign-off
- Conflict avoidance: never modify the same service in two parallel batches; never edit AGENTS.md in parallel

Acceptance criteria:
- [ ] Guide exists and references the dependency matrix

---

## 3) Performance Baselines & Checks

Deliverables:
- docs/10_201025_todays_status/performance_baselines.md

What to capture:
- Service boot time (cold start), memory footprint at idle
- Monolith request latency with flags OFF vs ON for each proxy (smoke level)
- Simple command examples and where to record results

Acceptance criteria:
- [ ] Baseline doc exists with fields to fill during execution

---

## 4) Security Checklist for Proxies

Deliverables:
- docs/10_201025_todays_status/security_checklist.md

Checklist topics:
- Do not log secrets or full payloads containing secrets
- Validate inputs before forwarding
- Enforce timeouts/retries with sane limits
- Sanitize error messages returned to clients
- Ensure feature flags default to OFF
- Confirm no PII leakage in logs or errors

Acceptance criteria:
- [ ] Security checklist exists and is referenced by proxy batches

---

## Global Validation (run before marking Priority 3 done)
- [ ] Templates, guides, and checklists present
- [ ] At least one batch executed using a template
- [ ] No process regressions introduced

Time budget: ~3 hours total.
