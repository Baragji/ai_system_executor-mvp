# Roadmap (Incremental, Evidence-First)

## Phase 0 — MVP
- Local Executor
- JSON schema validation
- Static UI + output browser
- Path sandboxing

## Phase 1 — Hardening
- Retry + repair for JSON
- Per-file checksums
- Minimal tests + CI

## Phase 2 — Capability
- Guarded tool: run npm install & test in generated project
- Monorepo option
- Evidence ledger

## Phase 3 — UX
- Next.js UI with history + diffs

# Complete roadmap

# COMPREHENSIVE PLAN

## CONTEXT: WHERE WE ARE NOW

**Current System**: A minimal executor UI that takes a text prompt, calls an LLM, validates JSON output against schema, and writes files to `/output`. It has good CI/CD, branch protection, and CODEOWNERS governance.

**What it is NOT**: Not autonomous. No self-testing, no repair loops, no planning, no memory, no multi-agent coordination.

---

## PART 1: SIX-PHASE OVERVIEW (The Complete Journey)

### Phase 0: Foundation (CURRENT STATE - COMPLETE)
**Goal**: A safe, validated executor that generates files from prompts.
**Success**: Prompt → JSON → files written to `/output`. CI green, branch protection active, governance enforced.
**Status**: ✅ Complete

### Phase 1: Self-Testing Loop (NEXT - 9 wins)
**Goal**: System generates code + tests, runs tests automatically, attempts one repair if tests fail.
**Success**: For "build me a Flask hello world with tests," the system generates code and tests, runs them in a sandbox, and if they fail, makes one repair attempt using failure logs. Final output shows pass/fail status.
**Timeline**: 9-14 days at current pace (one win per day, expandable to 2 wins per day with wife approval)

### Phase 2: Interactive Clarification (10-12 wins)
**Goal**: When information is missing, system asks targeted questions before building.
**Success**: If you say "build me an API" without specifying framework/port/database, system asks 2-3 specific questions, then generates based on answers. Reduces failed builds by 60%+.
**Why this matters**: Real autonomy requires knowing when to ask, not just guessing.

### Phase 3: Multi-Turn Repair (8-10 wins)
**Goal**: If first repair fails, system gets up to 3 more attempts (bounded), using concise failure analysis.
**Success**: 80%+ of standard tasks (CRUD APIs, simple frontends) go fully green without human edits.
**Why this matters**: Single repair isn't enough for complex tasks. Bounded attempts prevent infinite loops.

### Phase 4: Task Planning & Progress Monitoring (12-15 wins)
**Goal**: System decomposes larger requests into subtasks, executes them sequentially, and shows progress.
**Success**: "Build me a todo app with auth" gets broken into 5 subtasks (database setup, auth endpoints, CRUD endpoints, frontend, tests). System shows which step it's on, what passed/failed, estimated completion.
**Why this matters**: This is where it starts feeling "autonomous" - it plans its own work.

### Phase 5: Memory & Production Readiness (15-20 wins)
**Goal**: System remembers project conventions, previous decisions, preferred patterns. Adds security scanning, dependency updates, real-world task handling.
**Success**: After building 3 projects, system remembers "this user likes FastAPI + PostgreSQL + pytest" and suggests that stack. Handles real feature requests (not just demos) with appropriate security checks.
**Why this matters**: True autonomy requires learning from experience.

**Total Journey**: ~65-75 wins from current state to "autonomous enough to be useful daily"

---

## PART 2: PHASE 1 DETAILED BREAKDOWN (9 Wins ≤45 Minutes Each)

**Phase 1 Goal**: Self-Testing Loop with Single Repair Attempt

**Definition of Done**: System generates code + tests → runs tests in sandbox → if fail, makes one repair using failure logs → re-runs tests → returns pass/fail result.

---

### Win #1: Define Test Run Contract
**What**: Create `contracts/run-result.schema.json` defining the JSON structure for test results.

**Why**: Establishes stable interface between test runner, UI, and future repair system. Everything downstream depends on this contract.

**Who**: Lead developer

**How**: 
1. Create schema file with fields: `{status: 'pass'|'fail'|'error', passCount: number, failCount: number, durationMs: number, logsPath: string, timestamp: string}`
2. Add Ajv validation in `src/contracts/validators.ts`
3. Write unit test that validates 5 example run-results (2 pass, 2 fail, 1 error)
4. Commit with message: `feat(contracts): add run-result schema for test execution`

**When**: 30-40 minutes

**Success Criteria**: Schema file exists, validator compiles it, tests pass showing schema correctly accepts valid results and rejects invalid ones.

**What NOT to do**: Don't add execution logic yet, just the contract.

---

### Win #2: Sandboxed Test Runner
**What**: Create `src/runner/runInSandbox.ts` that executes `npm test` in a temporary directory with timeouts and resource limits.

**Why**: Safe, deterministic test execution is critical. Without sandboxing, generated code could harm the host system.

**Who**: Lead developer

**How**:
1. Use Node's `child_process.spawn` to run `npm test`
2. Set 60-second timeout (kill process if exceeded)
3. Capture stdout/stderr to `output/<project>/_last_test_run.log`
4. Return run-result JSON matching schema from Win #1
5. Write 3 tests: (a) passing tests, (b) failing tests, (c) timeout handling

**When**: 45 minutes

**Success Criteria**: Can execute tests in a temp directory, captures logs, enforces timeout, returns valid run-result JSON.

**What NOT to do**: Don't add repair logic yet. Don't try to make it work with every test framework - start with Jest/Vitest only.

---

### Win #3: API Endpoint for Test Execution
**What**: Add `POST /api/run-tests` endpoint that accepts `{project: string}` and returns run-result JSON.

**Why**: Provides HTTP interface for UI to trigger test runs. Separates concerns.

**Who**: Lead developer

**How**:
1. Add Express route in `src/api/routes.ts`
2. Validate request body (project name only)
3. Call sandboxed runner from Win #2
4. Return run-result JSON with Ajv validation
5. Write 2 integration tests: (a) successful run, (b) nonexistent project error

**When**: 35-45 minutes

**Success Criteria**: Endpoint callable via POST, returns valid run-result, integration tests pass.

**What NOT to do**: Don't add UI changes yet. Don't handle repair in this endpoint.

---

### Win #4: Update System Prompt to Require Tests
**What**: Modify `src/executor/systemPrompt.md` to mandate that generated code MUST include at least one test file.

**Why**: Can't have self-testing without tests. This forces the LLM to always generate tests alongside code.

**Who**: Lead developer

**How**:
1. Add explicit requirement: "MUST generate at least one test file in `tests/` or `__tests__/` directory"
2. Add example showing code + corresponding test
3. Write schema validator test that rejects outputs with zero test files
4. Update `contracts/executor-output.schema.json` to require `hasTests: boolean` field

**When**: 30-40 minutes

**Success Criteria**: System prompt clearly requires tests, schema validates test presence, existing generation tests updated to include tests.

**What NOT to do**: Don't change generation logic yet, just the prompt and contract.

---

### Win #5: UI "Run Tests" Button
**What**: Add "Run Tests" button to result page that calls `/api/run-tests` and displays pass/fail status.

**Why**: Makes test execution visible and accessible. User can manually trigger test runs.

**Who**: Lead developer

**How**:
1. Modify `public/index.html` to add button after generation completes
2. Update `public/script.js` to:
   - Call `/api/run-tests` on button click
   - Display status panel showing pass/fail, counts, duration
   - Link to log file if tests fail
3. Add basic CSS for status colors (green/red)

**When**: 40-45 minutes

**Success Criteria**: Button appears after generation, clicking it shows test results, logs accessible on failure.

**What NOT to do**: Don't add auto-run yet. Don't add repair UI yet. Keep it simple - just manual test triggering.

---

### Win #6: Single Repair Attempt Logic
**What**: Create `src/repair/singlePass.ts` that takes failed test results, calls LLM to fix code, writes changes, re-runs tests once.

**Why**: First step toward autonomy - system can improve its own output when tests fail.

**Who**: Lead developer

**How**:
1. Design repair prompt: "These tests failed: [failures]. Here's the code: [code]. Provide ONLY the fixed code as JSON diff."
2. Call LLM with failure logs + original code
3. Apply changes to files
4. Run tests again using sandboxed runner
5. Return both original and repaired run-results
6. Write 3 tests: (a) already-green project (no repair needed), (b) failing project that repairs successfully, (c) failing project that still fails after repair

**When**: 45-60 minutes (might be longest win in Phase 1)

**Success Criteria**: Can take failing test results, generate repair, apply it, re-run tests. Both original and final run-results captured.

**What NOT to do**: Don't add multi-turn repair yet. Exactly one repair attempt, even if it fails.

---

### Win #7: Integrate Repair into Execute Flow
**What**: Modify `/api/execute` to automatically trigger repair if initial tests fail.

**Why**: Makes repair automatic instead of manual. Complete the self-testing loop.

**Who**: Lead developer

**How**:
1. After generation completes, automatically run tests
2. If tests fail, call single repair from Win #6
3. Return both generation result AND test results (original + repaired if applicable)
4. Update response schema to include `testResults` field
5. Write integration test for full flow: generate → test fails → repair → test passes

**When**: 40-45 minutes

**Success Criteria**: Generation automatically includes test execution and repair attempt. API response includes complete test history.

**What NOT to do**: Don't change UI yet (that's next win). Keep API changes separate.

---

### Win #8: Update UI to Show Test Results
**What**: Modify UI to display test results automatically after generation, including repair attempts.

**Why**: User sees complete feedback loop without manual intervention.

**Who**: Lead developer

**How**:
1. Update result display to show test status badge (pass/fail/error)
2. If repair occurred, show "Repaired: [original status] → [final status]"
3. Display pass/fail counts, duration
4. Add expandable section for failure logs
5. Style with clear visual hierarchy (green success, yellow repair, red failure)

**When**: 40-45 minutes

**Success Criteria**: Generated results page shows complete test lifecycle. User can see at a glance if code works or needed repair.

**What NOT to do**: Don't add complex test history yet. Just show results from current generation.

---

### Win #9: Add Telemetry & Evidence File
**What**: Append `_executor_meta.json` to each generated project with complete test execution history and file checksums.

**Why**: Traceability, debugging, and future analytics. Proves what the system did.

**Who**: Lead developer

**How**:
1. Create `_executor_meta.json` structure: `{generatedAt, prompt, testRuns: [{attempt, status, passCount, failCount, durationMs, logsPath}], files: [{path, sha256}]}`
2. Calculate SHA-256 checksum for each generated file
3. Write meta file after generation + tests + repair complete
4. Write unit tests for checksum calculation and meta file structure
5. Add CI check that verifies meta files exist for fixture projects

**When**: 40-45 minutes

**Success Criteria**: Every generated project includes meta file with complete audit trail and file integrity checksums.

**What NOT to do**: Don't build analytics dashboard yet. Just capture the data.

---

## FOR THE LEAD DEVELOPER: TECHNICAL NOTES

### Current Tech Stack
- **Backend**: Node.js + TypeScript + Express
- **Testing**: Vitest + Supertest
- **Validation**: Ajv (JSON Schema)
- **LLM**: OpenAI/Anthropic via `.env` config
- **CI**: GitHub Actions with JUnit reporting
- **Coverage**: 93% currently (maintain >80% minimum)

### Architecture Principles
1. **Contract-first**: JSON schemas define all interfaces before implementation
2. **Small surface area**: One agent, one workflow, clear boundaries
3. **Test everything**: No feature ships without tests
4. **Evidence-based**: Every claim backed by logs/metrics
5. **Fail fast**: Better to error clearly than fail silently

### What NOT to Build (Yet)
- ❌ Multi-agent orchestration (Phase 4+)
- ❌ Project memory/learning (Phase 5)
- ❌ Complex planning (Phase 4)
- ❌ Database integration (Phase 5)
- ❌ Authentication (Phase 5)
- ❌ Cloud deployment (Phase 5)

Keep it simple. Prove self-testing works first.

### Integration Points for Future Phases
- `contracts/` folder: All JSON schemas live here
- `src/repair/`: Will expand to multi-turn in Phase 3
- `_executor_meta.json`: Foundation for analytics in Phase 4-5

---

## FINAL RECOMMENDATIONS

### For the Lead Developer
Phase 1 is achievable with the current codebase. Each win is truly independent and shippable. The contract-first approach means you can review schemas before implementation. Tests provide safety net.

**Most important**: The goal isn't speed. The goal is proving you can build incrementally without spiraling. Phase 1 is the test of whether you can continue long-term.

---

**This plan is complete, reviewed, and ready for governance approval.**
