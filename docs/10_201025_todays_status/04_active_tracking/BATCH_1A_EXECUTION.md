# Batch 1a Execution Instructions — Validation Scripts (Services)

**Status:** 📋 READY TO EXECUTE  
**Time Estimate:** 30 minutes  
**Risk Level:** Low (script additions only, no extraction)  
**Dependencies:** Batch 0 complete ✅

---

## Objective

Add `validate:all` script to each of the 7 service `package.json` files to ensure local validation passes before moving to extraction batches.

---

## Files to Modify (7 files)

1. `services/llm-gateway/package.json`
2. `services/orchestrator/package.json`
3. `services/runner/package.json`
4. `services/planning/package.json`
5. `services/repair/package.json`
6. `services/executor/package.json`
7. `services/clarification/package.json`

---

## Current State Check

### Verify Services Exist
```bash
ls -1 services/
# Expected output:
# _template/
# clarification/
# executor/
# llm-gateway/
# orchestrator/
# planning/
# repair/
# runner/
```

### Check Current Scripts (llm-gateway example)
```bash
cd services/llm-gateway
cat package.json | grep -A 10 '"scripts"'
```

**Current state (llm-gateway):**
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "tsx src/server.ts",
  "lint": "eslint --config ../../eslint.config.js src tests",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "node ./scripts/run-vitest-with-rollup-shim.mjs",
  "validate:all": "npm run lint && npm run typecheck && npm test"  // ✅ ALREADY EXISTS!
}
```

---

## Discovery: Services Status

Let me check which services already have `validate:all`:

### Service 1: llm-gateway
```bash
grep '"validate:all"' services/llm-gateway/package.json
```
**Status:** ✅ Script exists

### Service 2: orchestrator
```bash
grep '"validate:all"' services/orchestrator/package.json
```
**Status:** ? (needs verification)

### Service 3: runner
```bash
grep '"validate:all"' services/runner/package.json
```
**Status:** ? (needs verification)

### Service 4: planning
```bash
grep '"validate:all"' services/planning/package.json
```
**Status:** ? (needs verification)

### Service 5: repair
```bash
grep '"validate:all"' services/repair/package.json
```
**Status:** ? (needs verification)

### Service 6: executor
```bash
grep '"validate:all"' services/executor/package.json
```
**Status:** ? (needs verification)

### Service 7: clarification
```bash
grep '"validate:all"' services/clarification/package.json
```
**Status:** ? (needs verification)

---

## Execution Steps

### Step 1: Discovery Phase (5 min)

Check which services need the script:

```bash
cd services

for svc in orchestrator runner planning repair executor clarification; do
  if grep -q '"validate:all"' $svc/package.json 2>/dev/null; then
    echo "✅ $svc: validate:all exists"
  else
    echo "❌ $svc: validate:all MISSING"
  fi
done
```

### Step 2: Add validate:all Script (15 min)

For each service missing the script, add it after the `test` script:

**Pattern to add:**
```json
"validate:all": "npm run lint && npm run typecheck && npm test"
```

**Commands (for services missing the script):**

#### orchestrator
```bash
cd services/orchestrator
# Check current scripts
cat package.json | grep -A 10 '"scripts"'

# If validate:all missing, add it manually or use sed/jq
# Manual: Edit package.json, add line after "test" script
```

#### runner
```bash
cd services/runner
# Check current scripts
cat package.json | grep -A 10 '"scripts"'

# If validate:all missing, add it
```

#### planning
```bash
cd services/planning
# Check current scripts
cat package.json | grep -A 10 '"scripts"'

# If validate:all missing, add it
```

#### repair
```bash
cd services/repair
# Check current scripts
cat package.json | grep -A 10 '"scripts"'

# If validate:all missing, add it
```

#### executor
```bash
cd services/executor
# Check current scripts
cat package.json | grep -A 10 '"scripts"'

# If validate:all missing, add it
```

#### clarification
```bash
cd services/clarification
# Check current scripts
cat package.json | grep -A 10 '"scripts"'

# If validate:all missing, add it
```

---

## Step 3: Validation (Per Service - 10 min total)

For each service where script was added, test it:

```bash
cd services/<service-name>

# Test lint
npm run lint
# Expected: Exit 0 or warnings (acceptable for now)

# Test typecheck
npm run typecheck
# Expected: Exit 0 (must pass)

# Test suite
npm test
# Expected: Exit 0 or tests pass (coverage may vary)

# Test validate:all
npm run validate:all
# Expected: Runs all three in sequence
```

**Note:** Some services may have failing tests or missing test files. That's OK for Batch 1a. Goal is to ensure the *script exists and runs*, not that everything passes.

---

## Step 4: Verification Checks

### Per-Step Validation Pattern

- **Files/diff:** `git diff --name-only` shows only `services/*/package.json`
- **Service typecheck:** Each modified service's `npm run typecheck` exits 0
- **No deep imports:** Not applicable (no code changes)
- **Dependencies:** Not applicable (no deps changed)
- **Boot test:** Not applicable (no runtime changes)

### Comprehensive Check

```bash
# From repo root
cd /path/to/ai_system_executor-mvp

# Verify all 7 services have validate:all
for svc in llm-gateway orchestrator runner planning repair executor clarification; do
  if grep -q '"validate:all"' services/$svc/package.json; then
    echo "✅ $svc"
  else
    echo "❌ $svc MISSING"
  fi
done

# All should show ✅
```

---

## Step 5: Commit Changes

```bash
# Stage changes
git add services/*/package.json

# Verify staged files
git diff --cached --name-only
# Expected: Only package.json files in services/

# Commit
git commit -m "feat(services): add validate:all script to all 7 services

- Add validate:all script to orchestrator, runner, planning, repair, executor, clarification
- Script runs: lint && typecheck && test
- llm-gateway already had script (no change)
- Validates Batch 1a requirement: each service can run validation locally
- Next: Batch 1b (root validation orchestration)

Batch: 1a
Risk: Low (script additions only)
Breaking changes: None
Validation: Script exists and runs in all services"
```

---

## Step 6: Update Progress Tracker

```bash
# Edit .automation/refactor_progress.md
# Change line:
# - Batch 1a: Validation scripts (services) — [ ]
# To:
# - Batch 1a: Validation scripts (services) — [x] (2025-10-20, all 7 services have validate:all)
```

---

## Acceptance Criteria

- ✅ All 7 services have `"validate:all": "npm run lint && npm run typecheck && npm test"` in scripts
- ✅ Running `npm run validate:all` in each service executes all three commands
- ✅ `git diff --name-only` shows only `services/*/package.json` (max 6 files if llm-gateway unchanged)
- ✅ No typecheck errors introduced
- ✅ Commit message follows pattern
- ✅ Progress tracker updated

---

## Rollback Plan

If issues discovered:

```bash
# Revert commit
git revert HEAD

# Or reset if not pushed
git reset --hard HEAD~1

# Or manual revert per service
cd services/<service>
# Remove the validate:all line from package.json
```

---

## Expected Outcomes

### Files Changed
- Maximum 6 files (if llm-gateway already has script)
- Minimum 0 files (if all already have script)

### Time Spent
- Discovery: 5 min
- Implementation: 15 min (2-3 min per service)
- Validation: 10 min
- **Total:** ~30 min

### Validation Results
- All services can run `npm run validate:all`
- Some may fail tests (acceptable for now)
- All should compile (typecheck passes)

---

## Next Batch After 1a

**Batch 1b:** Validation scripts (root) - 30 min
- Add root-level `validate:all` orchestration
- Ensures CI-equivalent checks reproducible locally
- Files: `package.json`, possibly `scripts/*`

---

## Quick Reference Commands

```bash
# Discovery
for svc in llm-gateway orchestrator runner planning repair executor clarification; do
  grep '"validate:all"' services/$svc/package.json || echo "$svc: MISSING"
done

# Test one service
cd services/orchestrator
npm run validate:all

# Test all services (from root)
for svc in llm-gateway orchestrator runner planning repair executor clarification; do
  echo "Testing $svc..."
  (cd services/$svc && npm run validate:all)
done

# Verify changes
git diff --name-only

# Commit
git add services/*/package.json
git commit -m "feat(services): add validate:all script to all 7 services [Batch 1a]"

# Update tracker
nano .automation/refactor_progress.md
```

---

## Notes

- **llm-gateway already has the script** - verify others
- **Some services may have no tests yet** - script should still exist
- **Typecheck must pass** - failing typecheck blocks batch acceptance
- **Lint warnings acceptable** - will be fixed in later batches
- **This is low-risk** - only adding scripts, no code extraction

---

**Status:** Ready to execute  
**Blocker:** None  
**Next Action:** Run discovery step to see which services need the script
