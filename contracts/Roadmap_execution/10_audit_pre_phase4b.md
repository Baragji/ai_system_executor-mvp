## 1. What the System Can Do (Phase 0-4A Complete)

**Core Capabilities:**

**Generation & Validation (Phase 0)**
- Accept text prompts via web UI
- Call LLM (OpenAI/Anthropic) to generate code
- Validate LLM output against JSON schemas (Ajv strict mode)
- Write generated files to `/output/<project-name>/`
- Serve generated projects via Express server

**Self-Testing & Single Repair (Phase 1)**
- Generate tests alongside code (enforced via schema)
- Execute tests in sandboxed environment (60s timeout, isolated process)
- Parse test results (Jest/Vitest formats)
- Capture logs to `_last_test_run.log`
- Attempt single repair if tests fail (LLM-driven fix)
- Return complete test history (original + repaired results)
- Calculate file checksums (SHA-256) for integrity
- Generate `_executor_meta.json` with complete audit trail

**Interactive Clarification (Phase 2)**
- Detect missing critical information (framework, port, database, auth, styling, test framework)
- Generate targeted questions based on missing info
- Present questions via UI form (text/number/choice inputs)
- Collect user answers
- Augment original prompt with clarification context
- Suggest smart defaults based on prompt analysis (Python→Flask/FastAPI, Node→Express, simple→SQLite, production→PostgreSQL)
- Track clarification usage in metadata

**Multi-Turn Repair (Phase 3)**
- Analyze test failures concisely (<500 tokens, categorized by type)
- Generate surgical diffs instead of full file rewrites
- Build contextual repair prompts (progressive specificity across attempts)
- Execute up to 4 bounded repair attempts
- Stop early on first success
- Track complete repair history (attempts, changes, test results per attempt)
- Display repair timeline in UI
- Calculate repair metrics (efficiency, common failure types, time per attempt)

**Task Planning Foundation (Phase 4A)**
- Decompose complex prompts into 2-10 subtasks
- Validate decompositions for quality (clarity, dependencies, coverage)
- Detect circular dependencies
- Compute topological execution order
- Identify parallelizable subtasks
- Calculate critical path
- Track execution progress through subtasks
- Score decomposition quality (0-100, flag for human review if <70)

**Cross-Cutting Capabilities:**
- Dual-write telemetry (`.telemetry/events.log` + `.automation/execution_trace.jsonl`)
- Evaluation results logging (`.automation/evaluation_results.json`)
- Contract-first JSON Schema validation (Draft 2020-12)
- 80%+ line coverage, 75%+ branch coverage
- Lint/typecheck gates enforced
- Observability traces with task context

---

## 2. External Auditor Instructions

**Audit Scope:** Verify claimed capabilities of executor-mvp system (Phases 0-4A)

**Environment Setup:**
```bash
git clone <repository>
cd executor-mvp
node -v  # Verify v20.x
npm ci
cp .env.example .env  # Add OPENAI_API_KEY or ANTHROPIC_API_KEY
npm run build
npm start  # Server on http://localhost:3000
```

**Test Protocol:**

**Phase 0 Verification:**
1. Navigate to `http://localhost:3000`
2. Enter prompt: "build a simple calculator in Python"
3. Verify: Files written to `output/` directory
4. Verify: `_executor_meta.json` exists with checksums
5. **Expected:** Code generated, no tests yet (Phase 0 doesn't enforce tests)

**Phase 1 Verification:**
1. Prompt: "build a Flask hello world with pytest tests"
2. Verify: Test files present in `output/<project>/tests/`
3. Verify: Tests executed automatically (check `_last_test_run.log`)
4. Verify: If tests fail, one repair attempt made
5. Verify: `_executor_meta.json` includes `testRuns` array
6. Check: Can manually trigger tests via "Run Tests" button
7. **Expected:** Pass/fail status visible, repair attempted if needed

**Phase 2 Verification:**
1. Prompt: "build me an API" (intentionally vague)
2. Verify: Questions appear in UI (framework? port? database?)
3. Fill answers, submit
4. Verify: Generated code uses answered values
5. Verify: `_executor_meta.json` includes `clarification` field with questions + answers
6. Test skip flow: Repeat with "Skip Questions" button
7. **Expected:** Clarifications reduce ambiguity, metadata captures Q&A

**Phase 3 Verification:**
1. Prompt: "build a Flask app with broken tests" (intentionally create failing scenario)
2. Verify: Up to 4 repair attempts logged
3. Verify: Repair history visible in UI with timeline
4. Verify: Early termination if repair succeeds before attempt 4
5. Check `_executor_meta.json` for `repairMetrics`
6. **Expected:** Multiple attempts tracked, UI shows progression

**Phase 4A Verification:**
1. Run: `npm test -- task-plan.test.ts`
2. Verify: Task plan schema validates correctly
3. Run: `npm test -- decomposeTask.test.ts`
4. Verify: Decomposer creates 2-10 subtasks
5. Run: `npm test -- validateDecomposition.test.ts`
6. Verify: Validator scores quality, detects circular dependencies
7. Run: `npm test -- progressTracker.test.ts`
8. Verify: Progress tracking respects dependencies
9. Run: `npm test -- analyzeDependencies.test.ts`
10. Verify: Dependency analysis detects cycles, computes execution order
11. **Note:** Phase 4A is foundation only - no UI or integration yet

**Code Quality Verification:**
```bash
npm run lint        # Must pass with 0 warnings
npm run typecheck   # Must pass with 0 errors
npm test            # All tests pass
```

**Coverage Verification:**
```bash
npm test -- --coverage
# Verify: Lines ≥80%, Branches ≥75%
```

**Observability Verification:**
1. Check `.automation/execution_trace.jsonl` exists and contains recent entries
2. Check `.automation/evaluation_results.json` exists and contains quality dimensions
3. Check `.telemetry/events.log` contains generation/test/repair events
4. Verify all entries are valid JSONL (one JSON object per line)

**Blockers to Look For:**
- Tests failing unexpectedly
- Coverage below thresholds
- Lint/typecheck errors
- Missing artifacts (meta files, logs, traces)
- UI non-functional (buttons not working, errors in console)
- Schemas not validating correctly
- Repair loop not executing (stuck at single attempt)
- Clarifications not appearing when prompted with vague requests
- Decomposition producing invalid task plans (wrong subtask count, circular deps)

**Critical Questions:**
1. Does every generation produce a `_executor_meta.json`?
2. Do tests actually run in sandbox (check process isolation)?
3. Does multi-turn repair stop at 4 attempts max?
4. Can you break the system with edge cases (empty prompt, very long prompt, special characters)?
5. Are validation checkpoints documented (check `.automation/validation_*.md`)?

**Report Format:**
- **Working as Claimed:** List verified capabilities
- **Blockers Found:** Issues preventing claimed functionality
- **Edge Cases:** Unexpected behaviors or failures
- **Code Quality:** Lint/test/coverage results
- **Recommendations:** Suggested improvements or missing guardrails

---
