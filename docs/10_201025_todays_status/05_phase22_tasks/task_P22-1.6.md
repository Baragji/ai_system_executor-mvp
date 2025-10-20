# Task P22-1.6 — Clarification: Localize Detect/Generate/Types

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.5 complete
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
test -f .automation/evidence/P22-1.5/final_state.txt || { echo 'ERROR: P22-1.5 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(clarification|contracts)\/' services/clarification/src/routes/clarify.ts | tee /tmp/task_P22-1.6_imports_before.txt | wc -l | tee /tmp/task_P22-1.6_imports_count_before.txt
cd services/clarification && npm -s test -- --coverage | tee /tmp/task_P22-1.6_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Clarification route imports monolith modules:
  - services/clarification/src/routes/clarify.ts:5-8

## Solution Steps (≤10 files)

### Step 1: Create destination folder
```bash
mkdir -p services/clarification/src/domain
```

### Step 2: Copy monolith modules (use cp)
```bash
cp src/clarification/detectMissing.ts services/clarification/src/domain/detectMissing.ts
cp src/clarification/generateQuestions.ts services/clarification/src/domain/generateQuestions.ts
cp src/clarification/types.ts services/clarification/src/domain/types.ts
cp src/contracts/validators.ts services/clarification/src/domain/validators.ts
```

### Step 3: Update route imports
```bash
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/clarification/detectMissing\.js\'#'../domain/detectMissing.js'#g" services/clarification/src/routes/clarify.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/clarification/generateQuestions\.js\'#'../domain/generateQuestions.js'#g" services/clarification/src/routes/clarify.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/clarification/types\.js\'#'../domain/types.js'#g" services/clarification/src/routes/clarify.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/contracts/validators\.js\'#'../domain/validators.js'#g" services/clarification/src/routes/clarify.ts
```

### Step 4: Validate
```bash
cd services/clarification
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.6_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/clarification/src/routes/clarify.ts:1-140

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(clarification|contracts)\/' services/clarification/src/routes/clarify.ts | tee /tmp/task_P22-1.6_imports_after.txt | wc -l | tee /tmp/task_P22-1.6_imports_count_after.txt
```

## Decision Points (Error Handling)
- If typecheck/tests fail: ensure copied modules compile; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/clarification/
cd services/clarification && npm install && cd -
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.6
cat /tmp/task_P22-1.6_imports_before.txt /tmp/task_P22-1.6_imports_count_before.txt /tmp/task_P22-1.6_coverage_before.txt > .automation/evidence/P22-1.6/baseline_state.txt
cat /tmp/task_P22-1.6_imports_after.txt /tmp/task_P22-1.6_imports_count_after.txt /tmp/task_P22-1.6_coverage_after.txt > .automation/evidence/P22-1.6/final_state.txt
git diff --stat services/clarification/ > .automation/evidence/P22-1.6/git_diff.txt || true
```
