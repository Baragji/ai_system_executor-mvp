% Batch Templates Library

Use these copy/paste templates to structure refactoring work into 30–45 minute batches with clear validations and acceptance criteria.

---

## Template A — Service Extraction (per service, 5 batches)

1) Copy domain modules (30 min)
- Files to touch: `src/<domain>` → `services/<service>/src/domain`
- Validations:
  - Files exist at destination
  - `git diff --name-only` shows only expected files
- Accept:
  - Service TypeScript typecheck passes (`cd services/<service> && npm run -s typecheck`)

2) Fix internal imports (30 min)
- Files to touch: only copied domain files
- Validations:
  - Service typecheck passes
- Accept:
  - No new errors introduced

3) Update service routes (30 min)
- Files to touch: service route files only
- Validations:
  - `rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services/<service> | wc -l` returns `0`
- Accept:
  - Routes compile and unit tests pass

4) Add deps (30 min)
- Files to touch: `services/<service>/package.json`
- Validations:
  - `npm install` succeeds; lockfile updated
- Accept:
  - Lockfile changes committed; tests remain green

5) Boot test (30 min)
- Actions:
  - `npm start` (in service)
  - `curl -fsS http://localhost:<port>/healthz`
- Accept:
  - HTTP 200 OK; logs clean; flags remain OFF by default

---

## Template B — Proxy Integration (per service, 5 batches)

1) Client skeleton (30 min)
- Action: new typed client file in monolith/orchestrator
- Validations: unit tests with mocks

2) Feature flag guard (30 min)
- Action: `USE_<SERVICE>` flag (default false)
- Validations: OFF path unchanged; ON path covered by tests

3) Env/docs (20–30 min)
- Action: `.env.example` updates + docs
- Validations: service boots with defaults; docs link from plan

4) Unit tests (45 min)
- Action: mock client; success/error paths
- Validations: coverage thresholds (≥80% line / ≥75% branch)

5) Integration test (30 min)
- Action: run service + monolith with flag=true
- Validations: deterministic mocks; no network calls in unit tests

Acceptance (templates):
- [ ] Templates applied with per-step validations
- [ ] Grep checks ensure no deep imports remain
- [ ] Lint/typecheck/tests/contract checks pass after batches

