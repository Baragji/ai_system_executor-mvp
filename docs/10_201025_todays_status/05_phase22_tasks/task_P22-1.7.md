# Task P22-1.7 — Runner: Localize Domain Wrappers

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.6 complete
- Estimated Time: 30-45 minutes

## Required Context Files (Read Before Starting)
1. `CLAUDE.md`
2. `ai-stack.json`
3. `contracts/Roadmap_execution/22_phase22_service_extraction_contract.json`
4. `.automation/refactor_services_discovery.json`

## Stack Constraints (Enforced)
- TS/JS only; Node 20+; no Python; no framework drift; no API changes

## Setup (If Fresh Environment)
```bash
npm install
pwd && git status --short
```

## Prerequisites Validation
```bash
test -f .automation/evidence/P22-1.6/final_state.txt || { echo 'ERROR: P22-1.6 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(runner|telemetry)\/' services/runner/src/domain/runner.ts | tee /tmp/task_P22-1.7_imports_before.txt | wc -l | tee /tmp/task_P22-1.7_imports_count_before.txt
cd services/runner && npm -s test -- --coverage | tee /tmp/task_P22-1.7_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Runner domain re-exports monolith modules and telemetry:
  - services/runner/src/domain/runner.ts:1-7

## Solution Steps (≤10 files)

### Step 1: Create destination folders
```bash
mkdir -p services/runner/src/domain
mkdir -p services/runner/src/telemetry
```

### Step 2: Copy monolith modules (use cp)
```bash
cp src/runner/runInSandbox.ts services/runner/src/domain/runInSandbox.ts
cp src/runner/installDeps.ts services/runner/src/domain/installDeps.ts
cp src/telemetry/events.ts services/runner/src/telemetry/events.ts
```

### Step 3: Update domain wrapper
```bash
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/runner/runInSandbox\.js\'#'./runInSandbox.js'#g" services/runner/src/domain/runner.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/runner/installDeps\.js\'#'./installDeps.js'#g" services/runner/src/domain/runner.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/telemetry/events\.js\'#'../telemetry/events.js'#g" services/runner/src/domain/runner.ts
```

### Step 4: Validate
```bash
cd services/runner
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.7_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/runner/src/domain/runner.ts:1-20

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(runner|telemetry)\/' services/runner/src/domain/runner.ts | tee /tmp/task_P22-1.7_imports_after.txt | wc -l | tee /tmp/task_P22-1.7_imports_count_after.txt
```

## Decision Points (Error Handling)
- If typecheck/tests fail: confirm local wrapper paths; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/runner/
cd services/runner && npm install && cd -
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.7
cat /tmp/task_P22-1.7_imports_before.txt /tmp/task_P22-1.7_imports_count_before.txt /tmp/task_P22-1.7_coverage_before.txt > .automation/evidence/P22-1.7/baseline_state.txt
cat /tmp/task_P22-1.7_imports_after.txt /tmp/task_P22-1.7_imports_count_after.txt /tmp/task_P22-1.7_coverage_after.txt > .automation/evidence/P22-1.7/final_state.txt
git diff --stat services/runner/ > .automation/evidence/P22-1.7/git_diff.txt || true
```
