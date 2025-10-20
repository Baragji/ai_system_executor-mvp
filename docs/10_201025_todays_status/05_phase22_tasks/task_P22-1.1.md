# Task P22-1.1 — Planning: Localize Core Domain Context

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: None (first task)
- Estimated Time: 30-45 minutes

## Required Context Files (Read Before Starting)
1. `AGENTS.md` — Project overview, discovery protocol, stack constraints
2. `ai-stack.json` — Technology lock (TypeScript only, no Python)
3. `contracts/Roadmap_execution/22_phase22_service_extraction_contract.json` — Phase contract
4. `.automation/refactor_services_discovery.json` — Discovery artifact with integration points

## Stack Constraints (Enforced)
- TypeScript/JavaScript only
- Node.js 20+, Express, Vitest
- NO Python code
- NO frontend frameworks
- NO breaking API changes

## Setup (If Fresh Environment)
```bash
npm install
pwd  # Should be /Users/Yousef_1/Downloads/ai_system_executor-mvp
git status --short  # Should show only expected changes for this task
```

## Baseline Capture (Before Starting)
```bash
# Count deep imports in planning (current state)
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services/planning | tee /tmp/task_P22-1.1_imports_before.txt | wc -l | tee /tmp/task_P22-1.1_imports_count_before.txt

# Capture planning service tests + coverage (current state)
cd services/planning && npm -s test -- --coverage | tee /tmp/task_P22-1.1_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Deep imports in planning context reference monolith modules:
  - services/planning/src/domain/context.ts:3
  - services/planning/src/domain/context.ts:5
  - services/planning/src/domain/context.ts:6
  - services/planning/src/domain/context.ts:7
  - services/planning/src/domain/context.ts:10
  - services/planning/src/domain/context.ts:11

## Solution Steps (≤10 files)

### Step 1: Create destination folders
```bash
mkdir -p services/planning/src/domain
mkdir -p services/planning/src/telemetry
```

### Step 2: Copy monolith modules into the planning service (use cp)
```bash
cp src/executor/writeFiles.ts services/planning/src/domain/writeFiles.ts
cp src/utils/normalizeExports.ts services/planning/src/domain/normalizeExports.ts
cp src/utils/normalizeHealth.ts services/planning/src/domain/normalizeHealth.ts
cp src/telemetry/events.ts services/planning/src/telemetry/events.ts
cp src/fixtures/index.ts services/planning/src/domain/fixtures.ts
```

### Step 3: Update imports in context.ts to use localized modules
```bash
# Replace monolith imports with local domain/telemetry paths
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/executor/writeFiles\.js\'#'../domain/writeFiles.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/utils/normalizeExports\.js\'#'../domain/normalizeExports.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/utils/normalizeHealth\.js\'#'../domain/normalizeHealth.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/telemetry/events\.js\'#'../telemetry/events.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/fixtures/index\.js\'#'../domain/fixtures.js'#g" services/planning/src/domain/context.ts
```

### Step 4: Typecheck and run planning tests
```bash
cd services/planning
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.1_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/planning/src/domain/context.ts:1-120

## Validation
```bash
# Deep-imports count (should decrease)
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services/planning | tee /tmp/task_P22-1.1_imports_after.txt | wc -l | tee /tmp/task_P22-1.1_imports_count_after.txt

# Service validations
cd services/planning
npm run -s typecheck
npm -s test -- --coverage
cd - >/dev/null
```

## Decision Points (Error Handling)

### If `npm run -s typecheck` fails
1. Review TS errors in output.
2. Verify copied files exist in services/planning/src/domain and /telemetry.
3. Confirm import replacements in context.ts (`git diff` shows sed changes).
4. Do not proceed — execute rollback.

### If `npm -s test` fails or coverage regresses
1. Check that tests don’t import monolith paths.
2. Fix missing imports or adjust localized modules accordingly.
3. Do not proceed — execute rollback.

### If deep imports count doesn’t decrease
1. Re-run `rg` and inspect remaining matches.
2. Apply the same localization pattern for any missed paths.
3. Do not proceed — execute rollback.

## Rollback Procedure (If Validation Fails)
```bash
# Restore planning service tree
git restore services/planning/

# Reinstall dependencies (safety)
cd services/planning && npm install && cd -

# Report failure
echo "P22-1.1 failed" > /tmp/task_P22-1.1_failure.txt
git diff --stat > /tmp/task_P22-1.1_diff_failed.txt
# HALT — do not proceed to next task; escalate with captured outputs.
```

## Evidence of Completion

### Evidence Location
Create directory: `.automation/evidence/P22-1.1/`

### Required Evidence Files
1. baseline_state.txt —
   - cat /tmp/task_P22-1.1_imports_before.txt
   - cat /tmp/task_P22-1.1_imports_count_before.txt
   - cat /tmp/task_P22-1.1_coverage_before.txt
2. final_state.txt —
   - cat /tmp/task_P22-1.1_imports_after.txt
   - cat /tmp/task_P22-1.1_imports_count_after.txt
   - cat /tmp/task_P22-1.1_coverage_after.txt
3. git_diff.txt — `git diff --stat services/planning/`
4. test_output.txt — full planning test output (after)
5. imports_count.txt — deep import count after

### Success Criteria (All Must Pass)
- Deep imports in planning decreased (context.ts references removed).
- `npm run -s typecheck` exits 0.
- `npm -s test -- --coverage` exits 0.
- Coverage ≥ 80% line, ≥ 75% branch (no regression).
- No stack violations per ai-stack.json.

### Generate Evidence Bundle
```bash
mkdir -p .automation/evidence/P22-1.1
cat /tmp/task_P22-1.1_imports_before.txt /tmp/task_P22-1.1_imports_count_before.txt /tmp/task_P22-1.1_coverage_before.txt > .automation/evidence/P22-1.1/baseline_state.txt
cat /tmp/task_P22-1.1_imports_after.txt /tmp/task_P22-1.1_imports_count_after.txt /tmp/task_P22-1.1_coverage_after.txt > .automation/evidence/P22-1.1/final_state.txt
git diff --stat services/planning/ > .automation/evidence/P22-1.1/git_diff.txt || true
cp /tmp/task_P22-1.1_coverage_after.txt .automation/evidence/P22-1.1/test_output.txt || true
cp /tmp/task_P22-1.1_imports_count_after.txt .automation/evidence/P22-1.1/imports_count.txt || true
```
