# Task P22-1.10 — Root Validations + Coverage

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.9 complete
- Estimated Time: 30-45 minutes

## Required Context Files (Read Before Starting)
1. `CLAUDE.md`
2. `ai-stack.json`
3. `contracts/Roadmap_execution/22_phase22_service_extraction_contract.json`

## Stack Constraints (Enforced)
- TS/JS only; Node 20+; no Python; no framework drift; no API changes

## Setup (If Fresh Environment)
```bash
npm install
pwd && git status --short
```

## Prerequisites Validation
```bash
test -f .automation/evidence/P22-1.9/final_state.txt || { echo 'ERROR: P22-1.9 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
echo "(info) capturing current coverage before final pass" | tee /tmp/task_P22-1.10_before.txt
```

## Problem
- After localization, ensure repo-wide quality gates still pass.

## Solution Steps
```bash
npm run -s lint | tee /tmp/task_P22-1.10_lint.txt
npm run -s typecheck | tee /tmp/task_P22-1.10_typecheck.txt
npm -s test -- --coverage | tee /tmp/task_P22-1.10_tests.txt
npm run -s contract:check | tee /tmp/task_P22-1.10_contracts.txt
```

## Validation
```bash
grep -q "0 problems" /tmp/task_P22-1.10_lint.txt || echo "(warn) lint output review required"
```

## Decision Points (Error Handling)
- If any command exits non-zero: capture output and rollback any broad changes.

## Rollback Procedure (If Validation Fails)
```bash
git restore -SW :/
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.10
cat /tmp/task_P22-1.10_before.txt > .automation/evidence/P22-1.10/baseline_state.txt
cat /tmp/task_P22-1.10_lint.txt /tmp/task_P22-1.10_typecheck.txt /tmp/task_P22-1.10_tests.txt /tmp/task_P22-1.10_contracts.txt > .automation/evidence/P22-1.10/final_state.txt
```
