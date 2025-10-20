# Task P22-1.3 — Planning: Runner/Repair HTTP Adapters

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.2 complete
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
test -f .automation/evidence/P22-1.2/final_state.txt || { echo 'ERROR: P22-1.2 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/(runner|repair)\/' services/planning | tee /tmp/task_P22-1.3_imports_before.txt | wc -l | tee /tmp/task_P22-1.3_imports_count_before.txt
cd services/planning && npm -s test -- --coverage | tee /tmp/task_P22-1.3_coverage_before.txt ; cd - >/dev/null
```

## Problem (with evidence)
- Planning context directly calls monolith runner and repair functions:
  - services/planning/src/domain/context.ts:8 (runInSandbox)
  - services/planning/src/domain/context.ts:9 (multiTurnRepair)

## Solution Steps (≤10 files)

### Step 1: Create adapter stubs (HTTP clients)
```bash
mkdir -p services/planning/src/domain
cat > services/planning/src/domain/runnerClient.ts << 'EOF'
import { fetchJson } from "../lib/httpClient.js";

export async function run(options: { projectRoot: string; projectSlug: string; command?: string; timeoutMs?: number; env?: Record<string, string | undefined>; sessionId?: string }) {
  const base = process.env.RUNNER_URL?.trim();
  if (!base) throw new Error("RUNNER_URL is not set");
  return await fetchJson(new URL("/run", `${base}/`).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options),
  });
}
EOF

cat > services/planning/src/domain/repairClient.ts << 'EOF'
import { fetchJson } from "../lib/httpClient.js";

export async function multiTurn(context: unknown) {
  const base = process.env.REPAIR_URL?.trim();
  if (!base) throw new Error("REPAIR_URL is not set");
  return await fetchJson(new URL("/repair", `${base}/`).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ context }),
  });
}
EOF
```

### Step 2: Replace direct calls in context.ts
```bash
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/runner/runInSandbox\.js\'#'../domain/runnerClient.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#runInSandbox\(#run\(#g" services/planning/src/domain/context.ts
sed -i '' -E "s#\'\.\.\/\.\.\/\.\.\/\.\.\/src/repair/multiTurnRepair\.js\'#'../domain/repairClient.js'#g" services/planning/src/domain/context.ts
sed -i '' -E "s#multiTurnRepair\(#multiTurn\(#g" services/planning/src/domain/context.ts
```

### Step 3: Validate
```bash
cd services/planning
npm run -s typecheck
npm -s test -- --coverage | tee /tmp/task_P22-1.3_coverage_after.txt
cd - >/dev/null
```

## Files To Modify
- services/planning/src/domain/context.ts:80-140
- services/planning/src/domain/runnerClient.ts (new)
- services/planning/src/domain/repairClient.ts (new)

## Validation
```bash
rg -n '\.\.\/\.\.\/\.\.\/\.\.\/src\/(runner|repair)\/' services/planning | tee /tmp/task_P22-1.3_imports_after.txt | wc -l | tee /tmp/task_P22-1.3_imports_count_after.txt
cd services/planning && npm run -s typecheck && npm -s test -- --coverage ; cd - >/dev/null
```

## Decision Points (Error Handling)
- If env URLs are not set in tests, mock clients or inject base via process.env; rollback if unresolved.

## Rollback Procedure (If Validation Fails)
```bash
git restore services/planning/
cd services/planning && npm install && cd -
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-1.3
cat /tmp/task_P22-1.3_imports_before.txt /tmp/task_P22-1.3_imports_count_before.txt /tmp/task_P22-1.3_coverage_before.txt > .automation/evidence/P22-1.3/baseline_state.txt
cat /tmp/task_P22-1.3_imports_after.txt /tmp/task_P22-1.3_imports_count_after.txt /tmp/task_P22-1.3_coverage_after.txt > .automation/evidence/P22-1.3/final_state.txt
git diff --stat services/planning/ > .automation/evidence/P22-1.3/git_diff.txt || true
```
