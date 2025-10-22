# Phase 19 – Contract Sync & Evidence Regeneration (Phase 2B)

Date: 2025-10-14

Purpose: Close the Phase 19 Trust Spine gap by keeping the autonomous transition contract in lockstep with verified evidence. Adds an evidence-aware sync script, snapshot metadata, and automated tests.

Scope: Phase 2B of the post-audit recovery plan. Writes to Phase 19 contract only after regenerating/validating evidence. No API or schema changes.

---

## Integration Points

1) scripts/sync-contract-status.js (NEW)
- Location: scripts/sync-contract-status.js
- Role: Regenerates ephemeral artifacts (CycloneDX, SLSA) and updates task statuses based on live validations.
- Notes: ESM module exporting `syncContract` and CLI entrypoint. Accepts optional `--root` for testability.

2) package.json (npm scripts)
- Addition: `"state:sync": "node scripts/sync-contract-status.js 19"`
- Placement: Adjacent to existing `state:*` commands for discoverability.

3) scripts/snapshot-state.js (existing)
- Enhancement: Adds `sync_status` block derived from contract mtime and pending tasks to surface drift.
- Snippet:
  ```js
  const snapshot = {
    generated_at: new Date().toISOString(),
    data_sources: {
      gates: path.relative(ROOT, LEDGER_PATH),
      contract: contractPath ? path.relative(ROOT, contractPath) : null,
      git: 'git status --porcelain',
    },
    current_phase: {
      id: phaseId,
      name: phaseName,
      contract_path: contractPath ? path.relative(ROOT, contractPath) : null,
    },
  };
  snapshot.suggested_next_action = suggestNextAction({ gates, validations, uncommitted });
  ```

4) tests/state/sync.test.ts (NEW)
- Role: Ensures contract sync marks tasks complete when evidence is regenerated and remains idempotent.
- Strategy: Uses tmp workspace + spies for `execSync` to avoid heavyweight commands while verifying file checks.

5) .automation/phase19_state_sync_discovery.(json|md)
- Observability: Captures integration rationale for CDI traceability and governance review.

---

## Dependencies & Impacts

- New dependencies: None (reuses Node.js stdlib + existing npm scripts)
- Artifacts regenerated: `sbom.cdx.json`, `provenance.intoto.jsonl`
- CI impact: `npm run state:sync` can run in CI; leverages existing commands
- Contract scope: Updates only `contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json`

---

## Compliance Check

- Language: JavaScript/TypeScript only (ESM compliant)
- Tooling: Reuses `npm run sbom:cyclonedx`, `npm run provenance`, Vitest
- No new dependencies or feature flags
- Tests: Adds Vitest coverage for sync script + updates snapshot test expectations
- Governance: Evidence regeneration honors CODEOWNER constraints and ADR-019 trust spine requirements

---

## Open Questions / Risks

- CycloneDX and SLSA commands are heavier (~seconds); CLI emits progress logs to indicate work
- Requires write access to contract; script guards by checking validations before mutating

Rollback: Delete `scripts/sync-contract-status.js`, remove `state:sync` npm script, drop tests + snapshot `sync_status` block. Contract can be restored from git history.
