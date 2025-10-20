# Task P22-1.9 — Service-wide Deep Import Sweep

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.8 complete
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
test -f .automation/evidence/P22-1.8/final_state.txt || { echo 'ERROR: P22-1.8 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services | sort | tee /tmp/task_P22-1.9_matches_before.txt | wc -l | tee /tmp/task_P22-1.9_count_before.txt
```

## Problem
- Discovery shows deep imports across multiple services (47 matches).

## Solution Steps (≤10 files per pass)
```bash
# Identify remaining offenders
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services | sort | tee /tmp/task_P22-1.9_matches_after_first.txt

# For each result, apply the localization approach from tasks P22-1.1..1.8 (copy domain files + update imports).
# Keep each pass ≤10 files changed. Commit or record evidence between passes.
```

## Files To Modify
- As reported by rg output (limit per pass to keep changes small).

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/' services | sort | tee /tmp/task_P22-1.9_matches_after.txt | wc -l | tee /tmp/task_P22-1.9_count_after.txt
npm run -s lint && npm run -s typecheck && npm -s test -- --coverage | tee /tmp/task_P22-1.9_root_validations.txt
```

## Decision Points (Error Handling)
- If count not decreasing: pick specific offenders and localize; rollback partial changes if unstable.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.9
cat /tmp/task_P22-1.9_matches_before.txt /tmp/task_P22-1.9_count_before.txt > .automation/evidence/P22-1.9/baseline_state.txt
cat /tmp/task_P22-1.9_matches_after.txt /tmp/task_P22-1.9_count_after.txt /tmp/task_P22-1.9_root_validations.txt > .automation/evidence/P22-1.9/final_state.txt
```
