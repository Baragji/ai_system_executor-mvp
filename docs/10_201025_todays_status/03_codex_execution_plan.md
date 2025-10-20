# Codex Execution Strategy - Microservices Refactoring Completion

## Strategy Overview

**Problem:** 30 tasks partially complete; services exist but can't run independently due to:
1. Deep monolith imports (`../../../../src/...`)
2. Missing HTTP proxies in monolith
3. No domain logic in services

**Solution:** Break work into **8 focused batches** that Codex can execute sequentially, each producing verifiable git diffs.

---

## Batch Execution Principles

### What Works for Codex:
✅ **Single-focus tasks** - "Extract module X to service Y"  
✅ **Clear before/after states** - "Remove imports from A, add to B"  
✅ **Testable outcomes** - "Service boots without monolith dependencies"  
✅ **One service at a time** - Prevent cross-service conflicts  

### What Doesn't Work:
❌ "Fix everything"  
❌ Multi-service changes in one batch  
❌ Vague instructions like "improve architecture"  
❌ Tasks requiring human decision-making  

---

## Phase 1: Foundation (Batches 1-3)
**Goal:** Make services bootable without monolith

### Batch 1: Add Validation Scripts (LOW RISK)
**Duration:** 1-2 hours  
**Complexity:** Low  
**Verifiable:** Run script, check exit code

#### Codex Instructions:
```markdown
# Task: Add `validate:all` Script to All Services

## Context
Services lack aggregated validation command needed for CI.

## What to Do
For each service in `services/*/package.json`:
1. Add script: `"validate:all": "npm run lint && npm run typecheck && npm run test"`
2. Verify all three scripts exist; if missing, add stub that exits 0
3. Update root `package.json` with: `"validate:services": "npm run validate:all --workspaces"`

## Files to Modify
- `services/_template/package.json`
- `services/llm-gateway/package.json`
- `services/orchestrator/package.json`
- `services/runner/package.json`
- `services/planning/package.json`
- `services/repair/package.json`
- `services/executor/package.json`
- `services/clarification/package.json`
- `package.json` (root)

## Acceptance Criteria
- [ ] Each service runs `npm run validate:all` successfully
- [ ] Root `npm run validate:services` passes
- [ ] No new dependencies added

## How to Test
```bash
cd services/llm-gateway && npm run validate:all
cd ../orchestrator && npm run validate:all
# repeat for all services
npm run validate:services  # from root
```

## Expected Git Diff
- 8 service package.json files modified (+3 lines each)
- 1 root package.json modified (+1 line)
```

---

### Batch 2: Centralize Service Discovery (LOW RISK)
**Duration:** 2-3 hours  
**Complexity:** Low  
**Verifiable:** File exists with all ports documented

#### Codex Instructions:
```markdown
# Task: Create Central Service Discovery Documentation

## Context
Services use different ports but no central reference exists. This blocks proxy configuration.

## What to Do
1. Create `docs/SERVICE_DISCOVERY.md` with this structure:

```markdown
# Service Discovery Reference

## Local Development Ports

| Service | Port | Health Check | Environment Variable |
|---------|------|--------------|---------------------|
| Monolith | 3000 | /api/health | - |
| LLM Gateway | 3001 | /healthz | LLM_GATEWAY_URL |
| Orchestrator | 3002 | /healthz | ORCHESTRATOR_URL |
| Runner | 3003 | /healthz | RUNNER_URL |
| Planning | 3004 | /healthz | PLANNING_URL |
| Repair | 3005 | /healthz | REPAIR_URL |
| Executor | 3006 | /healthz | EXECUTOR_URL |
| Clarification | 3007 | /healthz | CLARIFICATION_URL |

## Default URLs (Development)
[List http://localhost:PORT for each]
```

2. Create root `.env.example` with all service URLs
3. Update each service `.env.example` to match assigned port

## Files to Create/Modify
- `docs/SERVICE_DISCOVERY.md` (new)
- `.env.example` (modify)
- `services/*/.env.example` (verify PORT matches)

## Acceptance Criteria
- [ ] All ports documented
- [ ] No port conflicts
- [ ] Environment variables follow convention

## How to Test
- Check file exists: `cat docs/SERVICE_DISCOVERY.md`
- Verify `.env.example` has all URLs
```

---

### Batch 3: Extract LLM Domain Module (MEDIUM RISK)
**Duration:** 4-6 hours  
**Complexity:** Medium  
**Verifiable:** Service boots, monolith references removed

#### Codex Instructions:
```markdown
# Task: Extract LLM Provider Logic into LLM Gateway Service

## Context
`services/llm-gateway/src/routes/complete.ts` imports `../../../../src/llm/providers/openai.ts`.
This prevents service from running independently.

## What to Do

### Step 1: Copy Domain Modules
Copy these files FROM monolith TO service:
- `src/llm/providers/openai.ts` → `services/llm-gateway/src/domain/providers/openai.ts`
- `src/llm/types.ts` → `services/llm-gateway/src/domain/types.ts`
- `src/llm/index.ts` → `services/llm-gateway/src/domain/llmClient.ts`

### Step 2: Fix Internal Imports
In copied files, change:
- `from '../types'` → `from './types'`
- `from './providers/openai'` → `from './providers/openai'`

### Step 3: Update Service Routes
In `services/llm-gateway/src/routes/complete.ts`:
- Change: `import { ... } from '../../../../src/llm/...'`
- To: `import { ... } from '../domain/...'`

### Step 4: Update Dependencies
In `services/llm-gateway/package.json`:
- Add any missing dependencies from monolith's `package.json` that domain modules need
- Common: `openai`, `anthropic`, etc.

## Files to Create
- `services/llm-gateway/src/domain/providers/openai.ts`
- `services/llm-gateway/src/domain/types.ts`
- `services/llm-gateway/src/domain/llmClient.ts`

## Files to Modify
- `services/llm-gateway/src/routes/complete.ts`
- `services/llm-gateway/src/routes/stream.ts`
- `services/llm-gateway/package.json`

## Files to NOT Touch
- DO NOT modify monolith `src/llm/*` yet (will delete after proxy working)

## Acceptance Criteria
- [ ] Service boots: `cd services/llm-gateway && npm start`
- [ ] No `../../../../` imports in service
- [ ] Health check returns 200
- [ ] Dependencies installed without errors

## How to Test
```bash
cd services/llm-gateway
npm install
npm start &
curl http://localhost:3001/healthz  # should return {"status":"ok"}
pkill -f "node.*llm-gateway"
```

## Expected Git Diff
- 3 new files in `services/llm-gateway/src/domain/`
- 2 route files modified (import changes)
- 1 package.json modified (dependencies)
```

---

## Phase 2: Service Isolation (Batches 4-6)
**Goal:** All services run independently

### Batch 4: Extract Planning Domain (MEDIUM RISK)
Same pattern as Batch 3:
- Copy `src/planning/*` → `services/planning/src/domain/`
- Fix imports in routes
- Add dependencies
- Test service boots independently

### Batch 5: Extract Repair Domain (MEDIUM RISK)
Same pattern for repair service.

### Batch 6: Extract Runner/Executor/Clarification Domains (MEDIUM RISK)
Parallel pattern for remaining services.

---

## Phase 3: Integration (Batches 7-8)
**Goal:** Monolith uses services via HTTP

### Batch 7: Implement LLM Gateway Proxy (HIGH RISK)
**Duration:** 6-8 hours  
**Complexity:** High  
**Verifiable:** Monolith calls service successfully

#### Codex Instructions:
```markdown
# Task: Wire Monolith to LLM Gateway Service via HTTP Proxy

## Context
Monolith `src/llm/index.ts` directly calls providers.
Need to proxy to service while maintaining backwards compatibility.

## What to Do

### Step 1: Create Proxy Client
Create `src/llm/gatewayClient.ts`:

```typescript
import { fetchJson } from './httpClient';

const GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:3001';
const USE_GATEWAY = process.env.USE_LLM_GATEWAY === 'true';

export async function completeViaGateway(params: CompleteParams) {
  return fetchJson(`${GATEWAY_URL}/complete`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

### Step 2: Add Feature Flag to LLM Client
In `src/llm/index.ts`:

```typescript
import { completeViaGateway } from './gatewayClient';

export async function complete(params: CompleteParams) {
  if (process.env.USE_LLM_GATEWAY === 'true') {
    return completeViaGateway(params);
  }
  // existing direct provider logic
}
```

### Step 3: Update Environment Variables
Add to `.env.example`:
```
USE_LLM_GATEWAY=false
LLM_GATEWAY_URL=http://localhost:3001
```

### Step 4: Add Tests
Create `tests/llm/gatewayClient.test.ts`:
- Mock fetch
- Verify correct URL called
- Verify headers passed

## Files to Create
- `src/llm/gatewayClient.ts`
- `tests/llm/gatewayClient.test.ts`

## Files to Modify
- `src/llm/index.ts` (add feature flag)
- `.env.example` (add vars)

## Acceptance Criteria
- [ ] With `USE_LLM_GATEWAY=false`, monolith works as before
- [ ] With `USE_LLM_GATEWAY=true`, requests go to service
- [ ] Tests pass
- [ ] No breaking changes to existing code

## How to Test
```bash
# Start service
cd services/llm-gateway && npm start &

# Test monolith with gateway
cd ../..
export USE_LLM_GATEWAY=true
export LLM_GATEWAY_URL=http://localhost:3001
npm test -- tests/llm

# Cleanup
pkill -f "node.*llm-gateway"
```

## Expected Git Diff
- 1 new proxy client file
- 1 new test file
- 1 modified llm/index.ts (~10 lines)
- 1 modified .env.example
```

### Batch 8: Implement Remaining Proxies
Repeat Batch 7 pattern for:
- Orchestrator proxy
- Runner proxy
- Planning/Repair/Executor/Clarification proxies

---

## Execution Workflow

### For Each Batch:

1. **Prepare Instructions**
```bash
# Copy batch markdown from above into file
cat > batch_instructions.md << 'EOF'
[paste Codex instructions here]
EOF
```

2. **Invoke Codex**
```bash
# Send to Codex with context
codex execute --file batch_instructions.md --context docs/10_201025_todays_status/
```

3. **Review Diff**
```bash
# Codex returns git diff
git diff > batch_N_changes.patch
# Review changes
cat batch_N_changes.patch
```

4. **Validate**
```bash
# Run acceptance criteria commands
# Check tests pass
# Verify service boots (if applicable)
```

5. **Commit or Iterate**
```bash
# If good:
git add -A
git commit -m "Batch N: [description]"

# If issues:
# Provide feedback to Codex with specific errors
codex execute --file batch_instructions.md --feedback "Error: [specific issue]"
```

---

## Risk Mitigation

### Before Each Batch:
- [ ] Commit current state: `git commit -m "Pre-batch checkpoint"`
- [ ] Create branch: `git checkout -b batch-N-[name]`
- [ ] Ensure tests pass: `npm test`

### After Each Batch:
- [ ] Run full test suite: `npm test`
- [ ] Check service boots: `cd services/[service] && npm start`
- [ ] Verify no broken imports: `npm run typecheck`

### If Batch Fails:
- [ ] Rollback: `git checkout main && git branch -D batch-N-[name]`
- [ ] Analyze failure: Review Codex output + error logs
- [ ] Refine instructions: Make task smaller or add constraints
- [ ] Retry batch

---

## Progress Tracking

### Batch Status Table
| Batch | Task | Duration Est. | Status | Commit SHA | Issues |
|-------|------|---------------|--------|------------|--------|
| 1 | Validation scripts | 2h | ⏳ PENDING | - | - |
| 2 | Service discovery | 3h | ⏳ PENDING | - | - |
| 3 | LLM domain extraction | 6h | ⏳ PENDING | - | - |
| 4 | Planning extraction | 6h | ⏳ PENDING | - | - |
| 5 | Repair extraction | 6h | ⏳ PENDING | - | - |
| 6 | Runner/Executor/Clarify | 8h | ⏳ PENDING | - | - |
| 7 | LLM Gateway proxy | 8h | ⏳ PENDING | - | - |
| 8 | Remaining proxies | 12h | ⏳ PENDING | - | - |

**Total Estimated Time:** 51 hours across 8 batches

### Update After Each Batch:
```markdown
| 1 | Validation scripts | 2h | ✅ DONE | abc123 | None |
```

---

## Success Criteria

### After All 8 Batches:
- [ ] All services boot with `npm start` (no monolith dependencies)
- [ ] Monolith proxies work with `USE_*_SERVICE=true` flags
- [ ] All tests pass: `npm test`
- [ ] All services pass: `npm run validate:services`
- [ ] No `../../../../src/` imports in any service
- [ ] Feature flags documented in `.env.example`

### Validation Command:
```bash
#!/bin/bash
# validate_refactor.sh

echo "Checking service independence..."
for service in llm-gateway orchestrator runner planning repair executor clarification; do
  cd services/$service
  npm install
  npm run validate:all || exit 1
  npm start &
  SERVICE_PID=$!
  sleep 2
  curl -f http://localhost:300X/healthz || exit 1  # X = service port
  kill $SERVICE_PID
  cd ../..
done

echo "Checking monolith integration..."
export USE_LLM_GATEWAY=true
export USE_ORCHESTRATOR=true
# ... set all feature flags
npm test || exit 1

echo "✅ All validations passed!"
```

---

## Next Steps After Completion

### Immediate (Week 1):
1. Enable feature flags in staging environment
2. Monitor service health + logs
3. Validate parity with monolith behavior

### Short-term (Week 2-4):
1. Remove monolith domain code (`src/llm`, `src/planning`, etc.)
2. Update CI to run per-service validation
3. Document service APIs (OpenAPI specs)

### Long-term (Month 2+):
1. Add service-to-service auth
2. Implement proper persistence (databases per service)
3. Scale services independently
4. Resume Phase 21 work with reduced context footprint

---

## Codex Invocation Templates

### Standard Batch Template:
```markdown
You are executing batch [N] of microservices refactoring.

CRITICAL RULES:
1. Only modify files explicitly listed in "Files to Create/Modify"
2. Do NOT refactor or improve code beyond the task scope
3. Preserve all existing functionality
4. Add tests only if specified
5. Follow existing code style

CONTEXT:
- You are working in: [repo path]
- Current branch: batch-[N]-[name]
- Previous batches completed: [list]

[paste batch instructions]

OUTPUT:
- Return git diff only
- Include commit message suggestion
- Note any assumptions made
```

### Feedback Template (if batch fails):
```markdown
Batch [N] failed with error:

```
[paste error output]
```

Root cause analysis:
[your analysis]

Adjusted instructions:
[modified task with fixes]
```

---

## Emergency Rollback Procedure

If multiple batches cause cascading failures:

```bash
# 1. Return to last known good state
git checkout main
git branch -D batch-*

# 2. Review what worked
git log --oneline -20

# 3. Cherry-pick successful commits
git cherry-pick [sha] [sha] ...

# 4. Resume from last successful batch
# Update batch status table
# Start next batch with lessons learned
```

---

**Strategy Version:** 1.0  
**Last Updated:** 2025-10-20  
**Expected Completion:** 8 batches × avg 6h = ~2 weeks with validation time