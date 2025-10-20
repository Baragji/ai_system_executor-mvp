# Task P22-1.2 — Planning: Localize Subtask Generation (LLM Trace + Generate)

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.1 complete
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
pwd  # /Users/Yousef_1/Downloads/ai_system_executor-mvp
git status --short
```

## Prerequisites Validation
```bash
test -f .automation/evidence/P22-1.1/final_state.txt || { echo 'ERROR: P22-1.1 not complete'; exit 1; }
grep -qi "PASS" .automation/evidence/P22-1.1/final_state.txt || echo "(info) final_state exists; detailed PASS check will be in service tests"
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services/planning | tee /tmp/task_P22-1.2_imports_before.txt | wc -l | tee /tmp/task_P22-1.2_imports_count_before.txt
cd services/planning && npm -s test -- --coverage | tee /tmp/task_P22-1.2_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Planning domain depends on monolith LLM trace and subtask generation/types:
  - services/planning/src/domain/context.ts:3
  - services/planning/src/domain/planning.ts:5,7,8,10,19

## Solution Steps (≤10 files)

### Step 1: Create destination folder
```bash
mkdir -p services/planning/src/domain
```

### Step 2: Copy monolith modules (use cp)
```bash
cp src/llm/trace.ts services/planning/src/domain/llmTrace.ts
cp src/planning/generateSubtaskOutput.ts services/planning/src/domain/generateSubtaskOutput.ts
cp src/planning/types.ts services/planning/src/domain/types.ts
```

### Step 3: Update imports to use localized modules
```bash
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/llm/trace\.js\'#'../domain/llmTrace.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/planning/generateSubtaskOutput\.js\'#'../domain/generateSubtaskOutput.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/planning/(decomposeTask|executeTaskPlan|estimateCompletion|types)\.js\'#'../domain/\1.js'#g" services/planning/src/domain/planning.ts
```

### Step 4: Validate
```bash
cd services/planning
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.2_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/planning/src/domain/context.ts:1-60
- services/planning/src/domain/planning.ts:1-24

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services/planning | tee /tmp/task_P22-1.2_imports_after.txt | wc -l | tee /tmp/task_P22-1.2_imports_count_after.txt
cd services/planning && npm run -s typecheck && npm -s test -- --coverage ; cd - >/dev/null
```

## Decision Points (Error Handling)
- If typecheck fails: confirm copied files and sed replacements; rollback if unresolved.
- If tests fail: ensure planning tests import local domain; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/planning/
cd services/planning && npm install && cd -
git diff --stat > /tmp/task_P22-1.2_diff_failed.txt || true
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.2
cat /tmp/task_P22-1.2_imports_before.txt /tmp/task_P22-1.2_imports_count_before.txt /tmp/task_P22-1.2_coverage_before.txt > .automation/evidence/P22-1.2/baseline_state.txt
cat /tmp/task_P22-1.2_imports_after.txt /tmp/task_P22-1.2_imports_count_after.txt /tmp/task_P22-1.2_coverage_after.txt > .automation/evidence/P22-1.2/final_state.txt
git diff --stat services/planning/ > .automation/evidence/P22-1.2/git_diff.txt || true
```
