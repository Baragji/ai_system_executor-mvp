# Task P22-3.5 — Final Validations and Gates

## Execution Context (Read First)
- Project: UMCA Executor MVP; Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-3.4 complete; Estimated Time: 30-45 minutes

## Solution Steps
```bash
npm run -s lint | tee /tmp/task_P22-3.5_lint.txt
npm run -s typecheck | tee /tmp/task_P22-3.5_type.txt
npm -s test -- --coverage | tee /tmp/task_P22-3.5_tests.txt
npm run -s contract:check | tee /tmp/task_P22-3.5_contracts.txt
npm run -s sbom:all | tee /tmp/task_P22-3.5_sbom.txt
npm run -s provenance | tee /tmp/task_P22-3.5_prov.txt
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-3.5
cat /tmp/task_P22-3.5_lint.txt /tmp/task_P22-3.5_type.txt /tmp/task_P22-3.5_tests.txt /tmp/task_P22-3.5_contracts.txt /tmp/task_P22-3.5_sbom.txt /tmp/task_P22-3.5_prov.txt > .automation/evidence/P22-3.5/final_state.txt
```

## Decision Points (Error Handling)
- If any command fails: capture outputs into final_state.txt, HALT, execute rollback or split issues into follow-up tasks.
