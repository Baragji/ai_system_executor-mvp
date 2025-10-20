# Task P22-3.1 — Orchestrator Service: Implement StepQueue Adapter

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-2.6 complete
- Estimated Time: 30-45 minutes

## Required Context Files (Read Before Starting)
1. `CLAUDE.md`
2. `ai-stack.json`

## Setup (If Fresh Environment)
```bash
npm install
pwd && git status --short
```

## Baseline Capture (Before Starting)
```bash
rg -n 'not implemented' services/orchestrator/src/domain/stepQueueAdapter.ts | tee /tmp/task_P22-3.1_baseline.txt || true
```

## Problem (with evidence)
- Adapter stub throws, preventing service from executing workflows:
  - services/orchestrator/src/domain/stepQueueAdapter.ts:31

## Solution Steps (≤10 files)
1) Implement `createStepQueueAdapter().runWorkflow()`:
   - Sequentially process provided steps; collect results with sequence/states.
   - Derive `last` from final completed step with data.
   - Support hooks.onStep for streaming.
2) Add focused unit tests covering happy path, optional steps, and failure propagation.

### Implementation Sketch (replace throw with real implementation)
```ts
export function createStepQueueAdapter(): StepQueueAdapter {
  return {
    async runWorkflow(_sessionId, steps, hooks) {
      const results: StepQueueStepResult[] = [];
      let seq = 0; let last: StepQueueStepResult | undefined;
      for (const s of steps) {
        const r: StepQueueStepResult = { stepId: String(++seq), stepType: s.type, status: "completed", sequence: seq, stop: s.stopOnSuccess === true, data: (s.payload as any) };
        results.push(r); hooks?.onStep?.(r); last = r; if (r.stop) break;
      }
      return { steps: results, last };
    },
  };
}
```

## Files To Modify
- services/orchestrator/src/domain/stepQueueAdapter.ts:1-120
- services/orchestrator/tests/executeRoutes.test.ts:1-200 (extend if needed)

## Validation
```bash
cd services/orchestrator
npm -s test -- tests/executeRoutes.test.ts | tee /tmp/task_P22-3.1_tests.txt
cd - >/dev/null
```

## Rollback Procedure (If Validation Fails)
```bash
git restore services/orchestrator/src/domain/stepQueueAdapter.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-3.1
cat /tmp/task_P22-3.1_baseline.txt > .automation/evidence/P22-3.1/baseline_state.txt || true
cat /tmp/task_P22-3.1_tests.txt > .automation/evidence/P22-3.1/final_state.txt
```
