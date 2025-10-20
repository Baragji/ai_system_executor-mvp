# Task P22-1.4 — Repair: Localize Analyze/Repair Domain

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.3 complete
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
test -f .automation/evidence/P22-1.3/final_state.txt || { echo 'ERROR: P22-1.3 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(repair|contracts|executor)\/' services/repair/src/routes | tee /tmp/task_P22-1.4_imports_before.txt | wc -l | tee /tmp/task_P22-1.4_imports_count_before.txt
cd services/repair && npm -s test -- --coverage | tee /tmp/task_P22-1.4_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Repair service routes import monolith modules and types:
  - services/repair/src/routes/analyze.ts:3,5
  - services/repair/src/routes/repair.ts:3-7

## Solution Steps (≤10 files)

### Step 1: Create destination folder
```bash
mkdir -p services/repair/src/domain
```

### Step 2: Copy monolith modules (use cp)
```bash
cp src/repair/analyzeFailure.ts services/repair/src/domain/analyzeFailure.ts
cp src/repair/repairOnce.ts services/repair/src/domain/repairOnce.ts
cp src/repair/multiTurnRepair.ts services/repair/src/domain/multiTurnRepair.ts
cp src/contracts/repairHistoryValidator.ts services/repair/src/domain/repairHistoryValidator.ts
cp src/contracts/validators.ts services/repair/src/domain/validators.ts
cp src/executor/types.ts services/repair/src/domain/executorTypes.ts
```

### Step 3: Update route imports
```bash
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/repair/analyzeFailure\.js\'#'../domain/analyzeFailure.js'#g" services/repair/src/routes/analyze.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/contracts/repairHistoryValidator\.js\'#'../domain/repairHistoryValidator.js'#g" services/repair/src/routes/analyze.ts

sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/repair/multiTurnRepair\.js\'#'../domain/multiTurnRepair.js'#g" services/repair/src/routes/repair.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/repair/repairOnce\.js\'#'../domain/repairOnce.js'#g" services/repair/src/routes/repair.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/contracts/validators\.js\'#'../domain/validators.js'#g" services/repair/src/routes/repair.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/contracts/repairHistoryValidator\.js\'#'../domain/repairHistoryValidator.js'#g" services/repair/src/routes/repair.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/executor/types\.js\'#'../domain/executorTypes.js'#g" services/repair/src/routes/repair.ts
```

### Step 4: Validate
```bash
cd services/repair
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.4_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/repair/src/routes/analyze.ts:1-40
- services/repair/src/routes/repair.ts:1-120

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(repair|contracts|executor)\/' services/repair/src/routes | tee /tmp/task_P22-1.4_imports_after.txt | wc -l | tee /tmp/task_P22-1.4_imports_count_after.txt
```

## Decision Points (Error Handling)
- If typecheck/tests fail: ensure copied modules compile in service context; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/repair/
cd services/repair && npm install && cd -
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.4
cat /tmp/task_P22-1.4_imports_before.txt /tmp/task_P22-1.4_imports_count_before.txt /tmp/task_P22-1.4_coverage_before.txt > .automation/evidence/P22-1.4/baseline_state.txt
cat /tmp/task_P22-1.4_imports_after.txt /tmp/task_P22-1.4_imports_count_after.txt /tmp/task_P22-1.4_coverage_after.txt > .automation/evidence/P22-1.4/final_state.txt
git diff --stat services/repair/ > .automation/evidence/P22-1.4/git_diff.txt || true
```
