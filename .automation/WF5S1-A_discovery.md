# WF5S1-A — Discovery Note: Canonical Gate Criteria

Date: 2025-10-16
Scope: Phase 5 Session 1 (WF5S1-A) — replace hard-coded detector strings with ledger-derived constants.

## Integration Points

- `.automation/GATES_LEDGER.md`
  - Source of truth for gate acceptance checkboxes. Need parser that can extract `### Acceptance Criteria` lists per gate (G0–G4).
  - Relevant snippets:
    - Gate G2 criteria include the command-bearing items:
      ```markdown
      - ✅ CycloneDX 1.6 SBOM generated via `npm run sbom:cyclonedx`
      - ✅ SLSA v1.0 provenance emitted via `npm run provenance`
      ```
    - Gate G3 criteria include the in-flight LangGraph checkbox:
      ```markdown
      - ⏳ POST `/api/execute` LangGraph integration (awaits G2 Trust Spine completion)
      ```

- `workflow/lib/` (new module)
  - `gateCriteria.ts` → shared helper that reads the ledger, caches parsed acceptance rows, and exposes lookup utilities for other workflow tools.
  - Must produce runtime-friendly `.js` counterpart for Node scripts (detector runs via `node`).

- `scripts/detect-evidence.js`
  - Replace literal `criterion` strings with imports from `workflow/lib/gateCriteria`.
  - Adjust rule set to align with real ledger text (e.g., SBOM, provenance, LangGraph integration).
  - Remove legacy "Trust Spine artifacts" aggregation in favour of per-criterion matches.

- Tests
  - `tests/scripts/detect-evidence.test.ts` / `tests/workflow/detectEvidence.test.ts`
    - Update expectations to use canonical ledger text.
    - Extend coverage to ensure rules skip when canonical text unavailable.
  - `tests/scripts/update-gate.test.ts`
    - Sample ledger fixture must mirror real criterion text so the auto-update test remains valid.

- Tooling guard
  - `scripts/check-detector-constants.js` already warns once `workflow/lib/gateCriteria.(ts|js)` exists. After scaffolding, detector must import constants to keep CI green.

## Observations

- Optional action `node scripts/list-gate-criteria.js --gate G3 --json` fails (module missing). Documented so we can follow up in later sessions if needed.
- Current detector strings ("Lint passing", "LangGraph parity tests passing", etc.) do not appear anywhere in the ledger. Auto-update therefore throws "Criterion not found" today.
- Ledger acceptance rows that map to executable commands are concentrated under Gate G2 (Trust Spine) and Gate G3 (LangGraph pilot). Earlier gates are documentation-only.

## Proposed Implementation

1. Build `workflow/lib/gateCriteria.ts` (and `.js`) to:
   - Read `.automation/GATES_LEDGER.md` synchronously with mtime-aware caching.
   - Parse `### Acceptance Criteria` bullet lists per gate, capturing status emoji + text.
   - Expose `requireCriterionText({ gateId, includes })` for deterministic lookups by substring tokens (e.g., `"npm run sbom:cyclonedx"`).
   - Provide `refreshGateCriteria()` for tests wanting a clean reload.

2. Update `scripts/detect-evidence.js` to:
   - Import canonical strings via the helper.
   - Downgrade to per-criterion matches for SBOM + provenance; maintain LangGraph integration rule using ledger text.
   - Remove combined "Trust Spine artifacts" aggregator; rely on deduping logic already present.
   - Gracefully skip rules if a criterion cannot be located (log once, continue execution).

3. Refresh unit tests:
   - Expect ledger-derived strings in assertions.
   - Add regression ensuring detector ignores lint/typecheck commands (no canonical criterion yet) so behaviour matches ledger reality.
   - Update gate auto-update fixture to use `POST `/api/execute` LangGraph integration (awaits G2 Trust Spine completion)` so detector + updater stay aligned.

4. Document discovery (.md + .json) and capture missing CLI helper in the trace for follow-up.

## Compliance

- Language: Node.js / TypeScript only — ✅
- No new dependencies — ✅
- No protected files touched — ✅
- Tests to run: `npm test -- tests/scripts/detect-evidence.test.ts` (per contract). Broader suite optional after refactor.