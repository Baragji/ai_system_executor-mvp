# WF5S2-B — Discovery Note

Date: 2025-10-16
Scope: Session 2 integrity hardening for Phase 5 workflow automation.

## Integration Points

- `tests/scripts/update-gate.test.ts`
  - Current unit tests rely on inlined sample ledgers (e.g. `SAMPLE_LEDGER`, `baseLedger`) instead of `.automation/GATES_LEDGER.md`, so they won't fail when the real ledger drifts. The suite exercises `updateGateMarkdown`, `validateLedgerUpdate`, and `autoUpdateLedgerWithEvidence` with synthetic text.

- `scripts/gate-auto-update.js`
  - Auto-update pipeline processes detector matches and writes ledger changes. Error handling today only logs a generic "encountered issues" banner followed by raw error text when nothing changes, which can be opaque when a canonical criterion is missing.

- `workflow/lib/gateCriteria.ts`
  - Provides `parseGateCriteria`, `loadGateCriteria`, and `requireCriterionText`. Needs direct unit coverage against the production ledger to guarantee parser compatibility with emoji/status glyphs.

- `scripts/detect-evidence.js`
  - Builds `DETECTION_RULES` from canonical criteria. When a criterion is missing it warns once per rule, but the CLI output lacks an overall summary of enabled vs. skipped rules.

- `.automation/GATES_LEDGER.md`
  - Source of truth for gate acceptance criteria. Gate G2 and G3 include the canonical strings we match in automation (`npm run sbom:cyclonedx`, `POST \`/api/execute\`` LangGraph integration, etc.). Tests should import or copy from this file instead of keeping duplicates.

## Risks & Considerations

- Updating tests to consume the real ledger requires copying to temp files to avoid mutating the repo asset during `autoUpdateLedgerWithEvidence` scenarios.
- Logging changes in `gate-auto-update.js` must remain backward compatible (no breaking CLI contract) while adding clarity for missing-criterion failures.
- New parser tests must run under Vitest without additional fixtures or dependencies.

## Compliance Checklist

- Language: TypeScript/JavaScript only ✔️
- Frameworks: None added ✔️
- Dependencies: No new npm packages ✔️
- Tests: Use existing Vitest runner ✔️
- Protected files: `.automation/GATES_LEDGER.md` is read-only; no modifications planned ✔️

## Planned Actions

1. Add `tests/workflow/gateCriteria.test.ts` covering `parseGateCriteria` and `requireCriterionText` against the live ledger file.
2. Refactor `tests/scripts/update-gate.test.ts` to load `.automation/GATES_LEDGER.md`, replace ad-hoc fixtures, and add regression coverage for missing-criterion errors.
3. Enhance `scripts/gate-auto-update.js` logging to clearly summarize successes vs. failures, including explicit messaging for missing canonical criteria.
4. Extend `scripts/detect-evidence.js` CLI output with a one-line summary enumerating enabled vs. skipped rules.
5. Ensure `scripts/check-detector-constants.js` remains wired through `npm run validate:all` so drift is caught in CI.