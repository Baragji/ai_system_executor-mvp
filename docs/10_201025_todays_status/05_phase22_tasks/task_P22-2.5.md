# Task P22-2.5 — Env/Docs Consolidation

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-2.4 complete
- Estimated Time: 30-45 minutes

## Required Context Files
1. `CLAUDE.md`
2. `ai-stack.json`

## Setup
```bash
npm install
pwd && git status --short
```

## Baseline Capture
```bash
rg -n '(_URL=|PORT=)' .env.example docs/env/README.md | tee /tmp/task_P22-2.5_baseline.txt
```

## Problem
- Root .env.example lacks URLs for newly proxied services; docs/env/README.md must list them.

## Solution Steps (≤10 files)
```bash
# Append commented examples to .env.example (idempotent)
cat >> .env.example << 'EOF'
# Optional service URLs (enable proxies)
# ORCHESTRATOR_URL=http://localhost:3005
# RUNNER_URL=http://localhost:3004
# PLANNING_URL=http://localhost:3003
# REPAIR_URL=http://localhost:3004
# EXECUTOR_URL=http://localhost:3001
# CLARIFICATION_URL=http://localhost:3007
# LLM_GATEWAY_URL=http://localhost:3006
EOF

# Verify docs have a ports/URL table (manually update if needed)
rg -n 'LLM_GATEWAY_URL|CLARIFICATION_URL|EXECUTOR_URL|REPAIR_URL' docs/env/README.md || echo '(action) Update docs/env/README.md to include these URLs'
```

## Files To Modify
- .env.example:1-40 (append examples)
- docs/env/README.md: add missing URLs if not present

## Validation
```bash
rg -n '(_URL=|PORT=)' .env.example docs/env/README.md services/*/.env.example | tee /tmp/task_P22-2.5_grep.txt
```

## Decision Points (Error Handling)
- If docs missing variables: add a URLs table row per service; ensure no port conflicts; keep changes minimal.

## Rollback Procedure (If Validation Fails)
```bash
git restore .env.example docs/env/README.md
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-2.5
cat /tmp/task_P22-2.5_baseline.txt > .automation/evidence/P22-2.5/baseline_state.txt
cat /tmp/task_P22-2.5_grep.txt > .automation/evidence/P22-2.5/final_state.txt
```
