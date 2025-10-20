# Task P22-3.3 — Performance Baselines

## Execution Context (Read First)
- Project: UMCA Executor MVP; Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-3.2 complete; Estimated Time: 30-45 minutes

## Required Context Files
1. `docs/10_201025_todays_status/01_guides/performance_baselines.md`

## Solution Steps
```bash
# Service boot + health
cd services/orchestrator && time npm start & sleep 2 && curl -w 'time_total=%{time_total}\n' -fsS http://localhost:3005/healthz -o /dev/null | tee /tmp/task_P22-3.3_orch_health.txt; pkill -f orchestrator || true
cd ../runner && time npm start & sleep 2 && curl -w 'time_total=%{time_total}\n' -fsS http://localhost:3004/healthz -o /dev/null | tee /tmp/task_P22-3.3_runner_health.txt; pkill -f runner || true
cd - >/dev/null

# Monolith latency (OFF vs ON)
unset AGENTS_RUNTIME && curl -w 'time_total=%{time_total}\n' -fsS http://localhost:3000/api/execute -H 'Content-Type: application/json' -d @tests/fixtures/simple-execute.json -o /dev/null | tee /tmp/task_P22-3.3_latency_off.txt
AGENTS_RUNTIME=langgraph curl -w 'time_total=%{time_total}\n' -fsS http://localhost:3000/api/execute -H 'Content-Type: application/json' -d @tests/fixtures/simple-execute.json -o /dev/null | tee /tmp/task_P22-3.3_latency_on.txt
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-3.3
cat /tmp/task_P22-3.3_orch_health.txt /tmp/task_P22-3.3_runner_health.txt /tmp/task_P22-3.3_latency_off.txt /tmp/task_P22-3.3_latency_on.txt > .automation/evidence/P22-3.3/final_state.txt
```

## Decision Points (Error Handling)
- If health or latency checks fail: ensure services start with default ports and monolith is running; re-run after fixing environment.
