# Task: Standardize Contract Versioning to SemVer

**Priority:** Medium  
**Effort:** 2-4 hours  
**Risk:** Low (metadata only, no runtime impact)  
**Created:** 2025-01-XX  
**Status:** Ready for assignment

---

## Problem

Contract versioning is inconsistent and confusing:
- Schema accepts both `A.1.0` (letter-prefixed) and `19.0.0` (numeric)
- Validation script filters out numeric versions by default
- New contract `19_phase19_langgraph_runtime_activation_contract.json` uses `"19.1.0"` which gets skipped
- Not industry standard (breaks SemVer tooling expectations)
- Phase information is duplicated (already in filename + `contract_meta.phase`)

**Current validation output:**
```
Found 8 contract(s) to validate
(Skipping legacy-numbered contracts)
```
→ The `19_phase19_langgraph_runtime_activation_contract.json` is silently ignored!

---

## Solution

Standardize all contracts to use **pure Semantic Versioning** (`MAJOR.MINOR.PATCH`):
- Phase information stays in filename and `contract_meta.phase`
- `contract_version` tracks revisions of that specific contract
- Standard SemVer format works with all tooling

---

## Files to Change

### 1. Schema (1 line)
**File:** `contracts/schemas/roadmap_phase.schema.json`

**Change line 20:**
```json
// Before:
"pattern": "^([A-Z]|\\d+)\\.\\d+\\.\\d+$",

// After:
"pattern": "^\\d+\\.\\d+\\.\\d+$",
```

**Update description:**
```json
"description": "Semantic version (MAJOR.MINOR.PATCH) tracking contract revisions"
```

---

### 2. Validation Script (~15 lines)
**File:** `scripts/validate-contract.js`

**Replace `isContract()` function (lines 143-154):**
```javascript
// Before:
function isContract(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contract = JSON.parse(content);
    
    const version = contract.contract_version;
    if (typeof version !== 'string' || version.length === 0) return false;
    const modernMatch = /^[A-Z]\.\d+\.\d+$/.test(version);
    const numericMatch = /^\d+\.\d+\.\d+$/.test(version);
    if (INCLUDE_LEGACY) return modernMatch || numericMatch;
    return modernMatch;
  } catch {
    return false;
  }
}

// After:
function isContract(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contract = JSON.parse(content);
    
    const version = contract.contract_version;
    if (typeof version !== 'string' || version.length === 0) return false;
    // Accept standard SemVer: MAJOR.MINOR.PATCH
    return /^\d+\.\d+\.\d+$/.test(version);
  } catch {
    return false;
  }
}
```

**Remove unused constant (line 20):**
```javascript
// Delete this line:
const INCLUDE_LEGACY = process.env.CONTRACT_INCLUDE_LEGACY === '1';
```

**Update log message (line 197):**
```javascript
// Before:
log(INCLUDE_LEGACY ? `(Including legacy-numbered contracts)\n` : `(Skipping legacy-numbered contracts)\n`, 'blue');

// After:
log(`(Validating all contracts with SemVer format)\n`, 'blue');
```

---

### 3. Contract Files (9 files × 1 line each)

Update `contract_version` in these files:

| File | Current | New |
|------|---------|-----|
| `11_phaseA_contract.json` | `"A.1.0"` | `"1.0.0"` |
| `11_phaseA_contract_enhanced.json` | `"A.1.0"` | `"1.0.0"` |
| `12B_trust_engine_contract.json` | `"B.1.0"` | `"1.0.0"` |
| `13_runner_process_group_timeout_contract.json` | `"C.1.0"` | `"1.0.0"` |
| `14_phase5_orchestration_contract.json` | `"D.1.0"` | `"1.0.0"` |
| `14b_PA-FIX2_dependency_preflight.json` | `"A.2.0"` | `"1.0.0"` |
| `15_Phase_E_Hardening.json` | `"E.1.0"` | `"1.0.0"` |
| `16_phaseA_accessibility_pause_contract.json` | `"A.3.0"` | `"1.0.0"` |
| `19_phase19_langgraph_runtime_activation_contract.json` | `"19.1.0"` | `"1.0.0"` |

**Note:** All set to `1.0.0` since these are first versions of their respective phase contracts.

---

### 4. Documentation (2 files)

**File:** `contracts/README.md`

Update the version format section:
```markdown
## Contract Version Format

Contracts use **Semantic Versioning** (SemVer) to track revisions:

- Format: `MAJOR.MINOR.PATCH` (e.g., `1.0.0`, `2.1.3`)
- MAJOR: Breaking changes to contract structure
- MINOR: Backward-compatible additions (new tasks, fields)
- PATCH: Corrections, clarifications, typo fixes

Phase information is stored in:
- Filename: `NN_phase<ID>_<slug>_contract.json`
- Metadata: `contract_meta.phase` field

Example:
```json
{
  "contract_version": "1.0.0",
  "contract_meta": {
    "phase": "19",
    "phase_name": "Autonomous Transition"
  }
}
```
```

**File:** `AGENTS.md`

Add to "Contract Quality" section (around line 150):
```markdown
### Contract Versioning
- Use Semantic Versioning: `MAJOR.MINOR.PATCH`
- First version of a phase contract: `1.0.0`
- Phase identifier in filename and `contract_meta.phase`
- Version tracks contract revisions, not phase numbers
```

---

## Validation Steps

```bash
# 1. Run contract validation (should now validate all 9 contracts)
npm run contract:check
# Expected: "Found 9 contract(s) to validate"
# Expected: "✅ All CDI contracts are valid!"

# 2. Verify schema validation still works
npm test -- validate-contract

# 3. Run full validation suite
npm run validate:all

# 4. Check CI passes
git add .
git commit -m "fix: standardize contract versioning to SemVer"
git push
# Verify .github/workflows/cdi-validation.yml passes
```

---

## Success Criteria

- [ ] Schema pattern updated to `^\d+\.\d+\.\d+$`
- [ ] Validation script simplified (no legacy filtering)
- [ ] All 9 contracts use `1.0.0` format
- [ ] Documentation updated (README.md, AGENTS.md)
- [ ] `npm run contract:check` validates all 9 contracts
- [ ] CI workflow passes
- [ ] No runtime code affected (metadata only)

---

## Rollback Plan

If issues arise:
```bash
git revert <commit-hash>
```

No runtime impact - this is pure metadata cleanup.

---

## Notes

- **Why `1.0.0` for all?** Each contract is the first version of its phase. Future revisions would increment appropriately.
- **No breaking changes:** Version field is metadata only, not used in runtime logic.
- **CI safe:** Workflow just runs `npm run contract:check`, no version parsing.
- **Standard practice:** SemVer is industry standard, works with all tooling.

---

## Questions?

Contact: @yousefbaragji or check `CDI_INFRASTRUCTURE.md` for context.
