# Task P22-1.5 — Executor: Localize Generate/Validate Domain

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.4 complete
- Estimated Time: 30-45 minutes

## Required Context Files (Read Before Starting)
1. `AGENTS.md`
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
test -f .automation/evidence/P22-1.4/final_state.txt || { echo 'ERROR: P22-1.4 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(executor|utils)\/' services/executor/src/routes | tee /tmp/task_P22-1.5_imports_before.txt | wc -l | tee /tmp/task_P22-1.5_imports_count_before.txt
cd services/executor && npm -s test -- --coverage | tee /tmp/task_P22-1.5_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Executor service routes import monolith modules:
  - services/executor/src/routes/generate.ts:5-8
  - services/executor/src/routes/validate.ts:5

## Solution Steps (≤10 files)

### Step 1: Create destination folder
```bash
mkdir -p services/executor/src/domain
```

### Step 2: Copy monolith executor modules (use cp)
```bash
cp src/executor/outputProcessing.ts services/executor/src/domain/outputProcessing.ts
cp src/executor/schema.ts services/executor/src/domain/schema.ts
cp src/executor/writeFiles.ts services/executor/src/domain/writeFiles.ts
cp src/executor/types.ts services/executor/src/domain/types.ts
cp src/utils/validateFiles.ts services/executor/src/domain/validateFiles.ts
```

### Step 3: Update route imports
```bash
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/executor/outputProcessing\.js\'#'../domain/outputProcessing.js'#g" services/executor/src/routes/generate.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/executor/schema\.js\'#'../domain/schema.js'#g" services/executor/src/routes/generate.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/executor/writeFiles\.js\'#'../domain/writeFiles.js'#g" services/executor/src/routes/generate.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/executor/types\.js\'#'../domain/types.js'#g" services/executor/src/routes/generate.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/utils/validateFiles\.js\'#'../domain/validateFiles.js'#g" services/executor/src/routes/validate.ts
```

### Step 4: Validate
```bash
cd services/executor
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.5_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/executor/src/routes/generate.ts:1-120
- services/executor/src/routes/validate.ts:1-40

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(executor|utils)\/' services/executor/src/routes | tee /tmp/task_P22-1.5_imports_after.txt | wc -l | tee /tmp/task_P22-1.5_imports_count_after.txt
```

## Decision Points (Error Handling)
- If typecheck/tests fail: ensure copied domain compiles in service; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/executor/
cd services/executor && npm install && cd -
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.5
cat /tmp/task_P22-1.5_imports_before.txt /tmp/task_P22-1.5_imports_count_before.txt /tmp/task_P22-1.5_coverage_before.txt > .automation/evidence/P22-1.5/baseline_state.txt
cat /tmp/task_P22-1.5_imports_after.txt /tmp/task_P22-1.5_imports_count_after.txt /tmp/task_P22-1.5_coverage_after.txt > .automation/evidence/P22-1.5/final_state.txt
git diff --stat services/executor/ > .automation/evidence/P22-1.5/git_diff.txt || true
```
