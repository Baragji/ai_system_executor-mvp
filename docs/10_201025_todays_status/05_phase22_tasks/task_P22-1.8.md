# Task P22-1.8 — Planning: Types Cleanup

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.7 complete
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
test -f .automation/evidence/P22-1.7/final_state.txt || { echo 'ERROR: P22-1.7 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(planning|clarification)/types\.js' services/planning/src/domain/planning.ts | tee /tmp/task_P22-1.8_imports_before.txt | wc -l | tee /tmp/task_P22-1.8_imports_count_before.txt
```

## Problem (with evidence)
- Planning still imports types from monolith files:
  - services/planning/src/domain/planning.ts:19 (../../../../src/planning/types.js)
  - services/planning/src/domain/planning.ts:21 (../../../../src/clarification/types.js)

## Solution Steps (≤10 files)
```bash
# Copy clarification types locally if needed
mkdir -p services/planning/src/domain
cp src/clarification/types.ts services/planning/src/domain/clarificationTypes.ts

# Update planning.ts imports
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/planning/types\.js\'#'../domain/types.js'#g" services/planning/src/domain/planning.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/clarification/types\.js\'#'../domain/clarificationTypes.js'#g" services/planning/src/domain/planning.ts

# Typecheck
cd services/planning && npm run -s typecheck ; cd - >/dev/null
```

## Files To Modify
- services/planning/src/domain/planning.ts:1-30

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/(planning|clarification)/types\.js' services/planning/src/domain/planning.ts | tee /tmp/task_P22-1.8_imports_after.txt | wc -l | tee /tmp/task_P22-1.8_imports_count_after.txt
```

## Decision Points (Error Handling)
- If typecheck fails: ensure local types files exist and correct import paths; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/planning/
cd services/planning && npm install && cd -
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.8
cat /tmp/task_P22-1.8_imports_before.txt /tmp/task_P22-1.8_imports_count_before.txt > .automation/evidence/P22-1.8/baseline_state.txt
cat /tmp/task_P22-1.8_imports_after.txt /tmp/task_P22-1.8_imports_count_after.txt > .automation/evidence/P22-1.8/final_state.txt
git diff --stat services/planning/ > .automation/evidence/P22-1.8/git_diff.txt || true
```
