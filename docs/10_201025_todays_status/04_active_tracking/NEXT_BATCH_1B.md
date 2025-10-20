# Next Batch: Batch 1b — Root Validation Scripts

## Batch 1a Status: ✅ COMPLETE (No Work Needed)

**Discovery Result:** All 7 services already have `validate:all` script in their package.json:
- ✅ llm-gateway
- ✅ orchestrator  
- ✅ runner
- ✅ planning
- ✅ repair
- ✅ executor
- ✅ clarification

**Action Taken:** Updated `.automation/refactor_progress.md` to mark Batch 1a complete.

---

## Next: Batch 1b — Validation Scripts (Root)

**Time Estimate:** 30 minutes  
**Risk Level:** Low  
**Dependencies:** Batch 1a complete ✅

### Objective
Add root-level `validate:all` script that orchestrates validation across all services and monolith code.

### Files to Modify (2 files max)

1. **`package.json`** (root) - Add `validate:all` script
2. **`scripts/validate-all.sh`** (optional) - Create if complex orchestration needed

### Current State Discovery

Check if root already has validation script:

```bash
grep '"validate:all"' package.json
```

### Expected Implementation

Add script to root `package.json`:

```json
"scripts": {
  // ... existing scripts ...
  "validate:all": "npm run -s lint && npm run -s typecheck && npm -s test && npm run -s contract:check"
}
```

Or if using workspaces to validate services too:

```json
"validate:all": "npm run -s lint && npm run -s typecheck && npm -s test && npm run -s contract:check && npm run validate:services",
"validate:services": "for svc in llm-gateway orchestrator runner planning repair executor clarification; do (cd services/$svc && npm run validate:all) || exit 1; done"
```

### Validation Steps

1. **Add script** to `package.json`
2. **Test execution:** `npm run validate:all`
3. **Verify output:** Should run lint, typecheck, test, contract:check in sequence
4. **Acceptance:** CI-equivalent checks reproducible locally

### Per-Step Validation Pattern

- **Files/diff:** `git diff --name-only` shows only `package.json` (and optionally `scripts/validate-all.sh`)
- **Service typecheck:** Not applicable (no service changes)
- **No deep imports:** Not applicable (no code changes)
- **Dependencies:** Not applicable (no deps changed)
- **Boot test:** Not applicable (no runtime changes)

### Acceptance Criteria

- ✅ Root `npm run validate:all` executes all required checks
- ✅ Exit code 0 when all pass, non-zero when any fail
- ✅ Output shows clear progress (lint → typecheck → test → contracts)
- ✅ Optional: Can validate all services in one command
- ✅ Commit message follows pattern
- ✅ Progress tracker updated

### Rollback Plan

```bash
# Revert commit
git revert HEAD

# Or reset if not pushed
git reset --hard HEAD~1

# Or manual: remove validate:all from package.json
```

---

## Alternative: Skip to Batch 2a

If root already has adequate validation (check with `npm run -s validate:all` or similar), we can skip Batch 1b and move to:

**Batch 2a — Discovery Docs Index (30 min)**
- Goal: Ensure `docs/10_201025_todays_status/README.md` links to all key artifacts
- Status: README already exists from reorganization ✅
- Likely already complete or minimal work needed

---

## Quick Check Commands

```bash
# Check if root has validate:all or equivalent
grep -E '"validate|"qa:|"check:all"' package.json

# Check available scripts
npm run

# Test current validation approach
npm run -s lint && npm run -s typecheck && npm -s test && npm run -s contract:check
```

---

## Recommendation

Run discovery first:

```bash
# 1. Check root package.json
cat package.json | grep -A 50 '"scripts"'

# 2. Look for existing validation patterns
npm run | grep -i valid

# 3. If no validate:all, add it per plan above
```

Then either:
- **Execute Batch 1b** if validation script needed (~30 min)
- **Skip to Batch 2a** if already adequate (~15 min to verify docs)

---

**Next Action:** Discover root validation state, then execute Batch 1b or proceed to 2a.
