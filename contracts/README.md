# Contract Naming Standard

**Effective:** 2025-10-13 (Phase 19+)
**Applies to:** All new contracts from Phase 19 onward

---

## Standard Format

```
NN_phase<ID>_<slug>_contract.json

Where:
- NN        = Zero-padded sequential number (01, 02, ..., 19, 20, ...)
- <ID>      = Phase identifier (matches contract_meta.phase field)
- <slug>    = Kebab-case short description
- contract  = Literal string "contract"
- .json     = File extension
```

---

## Examples

### ✅ Correct (Phase 19+ Standard)

```
19_phase19_autonomous_transition_contract.json
20_phase20_langgraph_executions_contract.json
21_phase21_trust_spine_completion_contract.json
```

### ❌ Legacy Naming (Phase 0-18)

These formats were used historically but should not be used for new contracts:

```
01_remediation_contract_v2.json          (version in filename)
4B1_adaptive_repair_contract.json        (letter-number hybrid)
14b_PA-FIX2_dependency_preflight.json    (lowercase prefix, caps infix)
12_phase_a_fix_contract-2.json           (inconsistent separators)
```

**Note:** Legacy contracts (01-18) remain as-is. No renaming required unless explicitly needed.

---

## Contract Metadata (Inside JSON)

Every contract must include standardized metadata:

```json
{
  "contract_version": "19.0.0",
  "contract_meta": {
    "created": "2025-10-13",
    "phase": "19",
    "phase_name": "Autonomous Transition — Trust Spine & LangGraph Foundation",
    "prerequisite_phase": "Phase A (UI fixes), Phase E (orchestration)",
    "supersedes": null,
    "status": "active",
    "enhancement": "Brief description of what this phase adds",
    "rationale": "Why this phase is needed",
    "references": [
      "Path to strategy docs",
      "Path to discovery artifacts",
      "Path to ADRs"
    ]
  }
}
```

### Metadata Fields

| Field | Required | Description | Example Values |
|-------|----------|-------------|----------------|
| `contract_version` | ✅ Yes | Semantic version | `"19.0.0"`, `"19.1.0"` |
| `created` | ✅ Yes | Date created (YYYY-MM-DD) | `"2025-10-13"` |
| `phase` | ✅ Yes | Phase ID (matches filename) | `"19"`, `"20"`, `"21"` |
| `phase_name` | ✅ Yes | Human-readable phase name | `"Autonomous Transition"` |
| `prerequisite_phase` | ✅ Yes | Required completed phases | `"Phase A, E"`, `"Phase 19 T0"` |
| `supersedes` | ✅ Yes | Previous contract (or `null`) | `"18_phase18_contract.json"`, `null` |
| `status` | ✅ Yes | Current status | `"active"`, `"completed"`, `"deprecated"` |
| `enhancement` | ✅ Yes | What this phase adds | Brief summary |
| `rationale` | ✅ Yes | Why needed | Problem statement |
| `references` | ✅ Yes | Related docs | Array of file paths |

---

## Finding Contracts

### By Phase Number

```bash
# Find Phase 19 contract
ls contracts/Roadmap_execution/19_*.json

# Find all Phase A contracts (legacy)
ls contracts/Roadmap_execution/*phaseA*.json
```

### By Status (inside JSON)

```bash
# Find active contracts
grep -l '"status": "active"' contracts/Roadmap_execution/*.json

# Find completed contracts
grep -l '"status": "completed"' contracts/Roadmap_execution/*.json
```

### By Contract Metadata

```json
// Look for "phase" field in contract_meta
{
  "contract_meta": {
    "phase": "19"  // Search for this
  }
}
```

---

## Contract Lifecycle

### 1. **Active**
Contract is currently being executed or is the primary contract for ongoing work.

**Status:** `"status": "active"`

### 2. **Completed**
All tasks executed, evidence collected, gates passed, work merged.

**Status:** `"status": "completed"`

### 3. **Deprecated** (optional)
Contract superseded by newer version or approach changed.

**Status:** `"status": "deprecated"`

**Required fields when deprecating:**
```json
{
  "contract_meta": {
    "status": "deprecated",
    "superseded_by": "19_phase19_autonomous_transition_contract.json",
    "deprecated_date": "2025-10-13",
    "deprecation_reason": "Replaced by unified Phase 19 contract"
  }
}
```

---

## Legacy Contracts (Phase 0-18)

### Understanding Legacy Naming

Contracts 01-18 use mixed naming conventions:

| Pattern | Example | Notes |
|---------|---------|-------|
| Sequential + version | `01_remediation_contract_v2.json` | Version in filename |
| Letter-number hybrid | `4B1_adaptive_repair_contract.json` | Phase 4B1 specialization |
| Lowercase prefix | `14b_PA-FIX2_dependency_preflight.json` | Phase A fixes |
| Mixed separators | `12_phase_a_fix_contract-2.json` | Dash vs underscore |

### Finding Legacy Contracts

**By numeric prefix:**
```bash
# Phase 0-4 core contracts
ls contracts/Roadmap_execution/0[0-9]_*.json

# Phase 4B specializations
ls contracts/Roadmap_execution/4B*.json

# Phase A variants
ls contracts/Roadmap_execution/*phase[Aa]*.json
```

**By phase reference in metadata:**
```bash
# Find Phase A contracts
grep -l '"phase": "A"' contracts/Roadmap_execution/*.json
```

### Should Legacy Contracts Be Renamed?

**Recommendation: NO**

**Reasons:**
1. No functional benefit (metadata is authoritative)
2. Risk of breaking automation if paths hardcoded
3. Existing references in docs/evidence
4. Historical value in preserving original naming

**Exception:** Rename if explicitly required for tool compatibility.

---

## Validation

### Contract Schema

All contracts must validate against:
```
contracts/schemas/roadmap_phase.schema.json
```

**Validate command:**
```bash
npm run contract:check
```

### Required Validation Checks

1. ✅ **JSON syntax valid**
2. ✅ **Schema validation passes**
3. ✅ **contract_meta.phase matches filename**
4. ✅ **All required metadata fields present**
5. ✅ **References point to existing files**
6. ✅ **Prerequisite phases exist and are completed**

---

## Creating a New Contract

### Step 1: Choose Sequential Number

```bash
# Find highest existing number
ls contracts/Roadmap_execution/*.json | sort -V | tail -1
# Output: 20_phase20_langgraph_executions_contract.json

# Next number: 21
```

### Step 2: Create File

```bash
# Template
touch contracts/Roadmap_execution/21_phase21_<slug>_contract.json
```

### Step 3: Add Metadata

Copy from Phase 19/20 contracts and update all fields.

### Step 4: Validate

```bash
npm run contract:check
```

### Step 5: Reference in CDI_INFRASTRUCTURE.md

Add to "Contracts" table with description.

---

## Quick Reference

### Current Active Contracts

| File | Phase | Status | Purpose |
|------|-------|--------|---------|
| `19_phase19_autonomous_transition_contract.json` | 19 | Active | Trust Spine + LangGraph foundation |
| `20_phase20_langgraph_executions_contract.json` | 20 | Completed | Executions endpoint |

### Legacy Contract Summary

- **Phases 0-4**: Core capabilities (remediation, clarification, repair, planning)
- **Phase 4B**: Specializations (4B1-4B4: adaptive repair, sandbox, resilience, telemetry)
- **Phase A**: UI baseline (11, 12, 12A, 14b, 16: accessibility, pause, trust engine)
- **Phase B**: Trust engine v1 (12B: test enforcement, run evidence)
- **Phase E**: Orchestration (14, 15: pause/resume, hardening)

---

## Troubleshooting

### Contract Not Found

```bash
# Search by phase
grep -r '"phase": "19"' contracts/Roadmap_execution/

# Search by name fragment
find contracts/Roadmap_execution/ -name "*langgraph*"
```

### Validation Fails

```bash
# Run with verbose output
npm run contract:check 2>&1 | tee contract-validation.log

# Check specific contract
cat contracts/Roadmap_execution/19_*.json | jq .contract_meta
```

### Naming Conflicts

If two contracts have same number:
1. One should be deprecated (update `status` field)
2. Or rename newer one to next available number

---

## Resources

- **Contract Schema**: `contracts/schemas/roadmap_phase.schema.json`
- **Validation Script**: `scripts/validate-contract.js`
- **CDI Guide**: `CDI_INFRASTRUCTURE.md`
- **Agent Instructions**: `AGENTS.md`
- **Phase 19 Strategy**: `docs/Goal_&_Vision_inspirational_only/03_final_decisions/phase19_autonomous_transition_strategy.md`

---

## Questions?

**For new developers:**
- Start with Phase 19/20 contracts as examples
- Use standard naming for all new contracts
- Validate before committing
- Reference in CDI_INFRASTRUCTURE.md

**For contract authors:**
- Follow metadata schema exactly
- Document all prerequisites
- Link to discovery artifacts
- Mark superseded contracts as deprecated
