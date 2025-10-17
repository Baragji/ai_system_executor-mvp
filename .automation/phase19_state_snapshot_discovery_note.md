# Phase 19 – Read-Only State Snapshot (WHERE_AM_I.json)

Date: 2025-10-14

Purpose: Provide a synthesized, read-only “where am I?” view for developers and AI agents without introducing a new source of truth or modifying schemas.

Scope: Phase 1 of the autonomous workflow progression plan (read-only synthesis). No schema writes, no API changes.

---

## Integration Points

1) scripts/snapshot-state.js (NEW)
- Location: scripts/snapshot-state.js
- Role: Generates `.automation/WHERE_AM_I.json` by reading authoritative sources.
- Notes: ESM, no dependencies, idempotent. Optional `--validate` to run lint/typecheck/tests/contract:check.

2) AGENTS.md (Minimal reference)
- Insertion under “Current Work” → “Quick Status Check”
- Snippet:
  ```bash
  npm run state:show  # Generates and displays .automation/WHERE_AM_I.json
  ```
- Rationale: Discoverability only. No protocol change.

3) package.json (npm scripts)
- Added:
  - `state:snapshot`: `node scripts/snapshot-state.js`
  - `state:show`: `node scripts/snapshot-state.js --print`

4) .gitignore
- Added `.automation/WHERE_AM_I.json` (generated; not committed)

5) .automation/GATES_LEDGER.md (Source)
- Parse `**Status:**` lines per gate.
- Example:
  ```markdown
  ## Gate G2: Trust-Spine Baseline
  **Status:** ✅ PASSED
  ```

6) contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json (Source)
- Expose `contract_meta.phase_name` and surface contract path.
- Path: contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json

7) scripts/validate-contract.js (Reference only)
- Pattern for Ajv schema usage; used only when `--validate` is passed.

---

## Code Snippets (±10 lines)

- Gates parsing (scripts/snapshot-state.js):
  ```js
  function parseGatesLedger(md) {
    const summary = {};
    if (!md) return summary;
    const gateBlocks = md.split(/\n---\n/g);
    for (const block of gateBlocks) {
      const gateMatch = block.match(/##\s+Gate\s+(G\d+)/);
      if (!gateMatch) continue;
      const id = gateMatch[1];
      const statusLine = block.match(/\*\*Status:\*\*\s*([^\n]+)/);
      const status = normalizeStatus(statusLine ? statusLine[1] : '');
      summary[id] = status;
    }
    return summary;
  }
  ```

- Suggested next action (scripts/snapshot-state.js):
  ```js
  function suggestNextAction({ gates, validations, uncommitted }) {
    const g2 = gates['G2'];
    const g3 = gates['G3'];
    if (uncommitted.length > 0) {
      const testChanges = uncommitted.some((l) => /\stests\//.test(l));
      return {
        action: testChanges ? 'COMMIT_PENDING_TESTS' : 'COMMIT_PENDING_CHANGES',
        reasoning: 'Uncommitted changes detected. Commit to persist progress.',
        command: "git add -A && git commit -m 'chore: persist progress'",
      };
    }
    if (validations && validations.lint === 'fail' || validations.typecheck === 'fail' || validations.test === 'fail') {
      return { action: 'FIX_VALIDATION_ERRORS', reasoning: 'One or more validations failing.', command: 'npm run validate:all' };
    }
    if (g2 === 'passed' && (g3 === 'partial' || g3 === 'not_started' || !g3)) {
      return { action: 'ADVANCE_ORCHESTRATOR_PILOT', reasoning: 'Trust Spine (G2) passed; G3 is partial.', command: 'AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts' };
    }
    return { action: 'NO_ACTION', reasoning: 'Repository is clean and validations are not flagged.', command: null };
  }
  ```

---

## Dependencies and Impacts

- New dependencies: None
- Contracts: Read-only
- CI: Unchanged (optional `--validate` triggers local runs only)
- APIs: No changes

---

## Compliance Check

- Language: JS/TS only (Node 20), ESM compliant
- Lint: Zero warnings (verified `npm run lint`)
- Tests: Added `tests/state/snapshot.test.ts` (non-intrusive)
- Coverage: Maintained per project thresholds (no degradation expected)
- No new frameworks; no frontend changes

---

## Rationale

Addresses “what’s next / where am I” with a safe, additive utility:
- Read-only snapshot avoids parallel sources of truth
- Machine-readable output supports automation and CI integration
- Optional validations allow fast default runs (<2s) with `--no-validate`

---

## Rollback / Failure Mode

- Remove npm scripts and `scripts/snapshot-state.js`
- Ignore file remains harmless
- No data migration / no contract changes

