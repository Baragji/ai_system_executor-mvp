# Evidence Detector Behavior Changes

**Date:** 2025-10-17
**PR:** G3 Workflow Fix (fix/wf5-g3-context-and-evidence)

## Summary

The evidence detection system (`scripts/detect-evidence.js`) now uses **canonical criteria from `.automation/GATES_LEDGER.md`** as the single source of truth. This ensures consistency between gate definitions and evidence matching.

---

## Key Changes

### 1. **G0/G1 Validation Evidence Removed** (Intentional)

**Previous Behavior:**
- Detector emitted evidence for lint, typecheck, and test suite runs (G0)
- Detector emitted evidence for contract validation runs (G1)
- These were never written to the ledger anyway

**New Behavior:**
- G0 lint/typecheck/test validation checks **no longer generate gate evidence**
- G1 contract validation checks **no longer generate gate evidence**
- These validations still run via `npm run validate:all`; they're just not tracked as gate acceptance criteria

**Rationale:**
Per Option 3 (hybrid approach), G0/G1 represent foundational quality gates that are validated continuously but don't need per-run evidence tracking. The ledger tracks **milestone achievements** (G2, G3, G4), not routine validations.

---

### 2. **G2 SBOM and Provenance Now Separate Criteria**

**Previous Behavior:**
- Detector aggregated SBOM + Provenance into a single criterion: `"Trust Spine artifacts generated (SBOM + provenance)"`
- Required both commands to run (either separately or combined)

**New Behavior:**
- G2 SBOM and Provenance are **separate criteria** in the ledger:
  - `"CycloneDX 1.6 SBOM generated via \`npm run sbom:cyclonedx\`"`
  - `"SLSA v1.0 provenance emitted via \`npm run provenance\`"`
- Each is detected and tracked independently
- Running `npm run sbom:all` satisfies both (command contains both strings)

**Rationale:**
More granular evidence tracking allows partial completion. If SBOM succeeds but provenance fails, the system records the partial success.

---

### 3. **G3 Context-Aware Aggregation**

**Previous Behavior:**
- G3 required `/api/execute`, `AGENTS_RUNTIME=langgraph`, and `tests/api/executions.test.ts` **all in one command**
- Separate runs were not recognized

**New Behavior:**
- G3 aggregates evidence from **separate log entries**:
  - At least one successful `/api/execute` entry (curl or POST)
  - At least one successful `npm test tests/api/executions.test.ts` entry
- Emits single G3 match with:
  - **Canonical criterion:** `"POST \`/api/execute\` LangGraph integration (awaits G2 Trust Spine completion)"`
  - **Command:** Real `/api/execute` curl command (for audit trail)
  - **Timestamp:** Latest of the two signals
  - **Source:** `"aggregated"`

**Rationale:**
Enables realistic workflows where `/api/execute` testing and parity tests run separately. The system now recognizes both signals and correctly aggregates them.

---

### 4. **Command Fidelity (No Placeholders)**

**Previous Behavior:**
- Some evidence used placeholder strings like `"(/api/execute + executions.test.ts both succeeded)"`

**New Behavior:**
- Evidence always records **real shell commands** from action logs
- For aggregated G3: uses the actual `/api/execute` curl command
- If command unavailable, sets to `undefined` (allows `autoUpdateLedgerWithEvidence` to fall back)

**Rationale:**
Audit trails must show exact reproduction steps. Recording placeholders loses critical context (curl flags, headers, request payloads).

---

## Migration Path

### If You Were Relying on G0/G1 Evidence

**Before:**
```json
{
  "gate": "G0",
  "criterion": "Lint passing",
  "command": "npm run lint"
}
```

**After:**
No evidence emitted. Use `npm run validate:all` or check CI pipeline status directly.

**Alternative:**
If you need validation evidence for observability, create a new module `workflow/lib/detectorCriteria.js` with validation-specific constants and log them to a separate file (not the ledger).

---

### If You Were Checking G2 Aggregated Evidence

**Before:**
```json
{
  "gate": "G2",
  "criterion": "Trust Spine artifacts generated (SBOM + provenance)"
}
```

**After:**
```json
[
  {
    "gate": "G2",
    "criterion": "CycloneDX 1.6 SBOM generated via `npm run sbom:cyclonedx`",
    "command": "npm run sbom:all"
  },
  {
    "gate": "G2",
    "criterion": "SLSA v1.0 provenance emitted via `npm run provenance`",
    "command": "npm run provenance"
  }
]
```

**Impact:**
- Gate G2 passes when **both** criteria are complete (unchanged)
- More granular tracking allows partial credit
- No action required if you were checking overall G2 status

---

### If You Were Running Combined G3 Commands

**Before (combined):**
```bash
AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts && curl ... /api/execute
```

**After (separate runs work too):**
```bash
# Terminal 1
npm start

# Terminal 2
curl -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"input":"test"}'

# Terminal 3
npm test tests/api/executions.test.ts

# G3 evidence automatically aggregated
```

**Impact:**
- Both approaches now work (combined **or** separate)
- Audit trail shows real curl command
- No action required

---

## Verification

To confirm the new behavior:

```bash
# Check detection output uses canonical criteria
node scripts/detect-evidence.js --json | jq .

# Verify constants guard passes
node scripts/check-detector-constants.js
# Expected: ✅ Detector constants check passed (no hardcoded criterion strings).

# Verify tests pass
npm test tests/scripts/detect-evidence.test.ts tests/workflow/detectEvidence.test.ts
npm test tests/scripts/update-gate.test.ts
```

---

## Related Files

- `scripts/detect-evidence.js` - Main detection logic
- `workflow/lib/gateCriteria.ts` - Canonical criterion loader
- `.automation/GATES_LEDGER.md` - Source of truth for criteria text
- `scripts/check-detector-constants.js` - Guard against hard-coded strings

---

## Questions?

If you encounter issues with evidence detection after this change:

1. Run `node scripts/detect-evidence.js --json` and check the output
2. Verify your `.automation/GATES_LEDGER.md` has the expected acceptance criteria
3. Check action logs: `.automation/actions.jsonl` and `.automation/execution_trace.jsonl`
4. File an issue with the detector output and log snippet

---

**End of Migration Guide**
