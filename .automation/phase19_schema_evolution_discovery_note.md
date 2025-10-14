# Phase 19 – Phase 2 Schema Evolution Discovery

## Objective
Add optional status metadata to the roadmap phase schema and seed Phase 19 contract data so the snapshot + shared state module can rely on a single authoritative structure.

## Integration Points
1. **contracts/schemas/roadmap_phase.schema.json**
   - Extend the `tasks.items.properties` block with optional fields: `status`, `started_at`, `completed_at`, `validation_results` (array of `{cmd, exit_code, timestamp}`).
   - Tighten `gates.items.properties.status` to an enum of allowed lifecycle values while staying compatible with current entries (include `partial`).
2. **contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json**
   - Populate new fields for each gate/task where evidence exists. Start conservatively (`pending` default) to avoid overstating progress; fill timestamps only when known.
   - Add an empty `validation_results` array for tasks that already list validation commands so future automation can append results.
3. **scripts/validate-contract.js**
   - After Ajv validation, enforce semantic checks:
     - Gate status must align with enum.
     - Task with `status === "complete"` must also include `completed_at` timestamp.
     - `validation_results` entries must mirror `validation` commands when provided (same `cmd`).
4. **scripts/snapshot-state.js**
   - Surface `tasks` array from contract (id, title, status, completed_at) so CLI users see progress deltas.
5. **tests/state/phaseState.test.ts**
   - Verify `loadPhaseState` exposes the seeded status metadata and that `formatHumanSummary` reflects completion state.

## Risks & Mitigations
- **Schema backwards compatibility**: Fields remain optional; Ajv stays in non-strict mode so older contracts without the metadata still pass.
- **Data accuracy**: Default to `pending` when uncertain. Add TODO comments in contract for manual verification rather than guessing.
- **Validation strictness**: New semantic checks should warn instead of fail if metadata missing; implement as non-blocking warnings for now to respect current contract maturity.

## Compliance Check
- Language: JavaScript/TypeScript only ✅
- No new dependencies ✅
- Tests: extend existing Vitest suites ✅
- Lint: reuse existing config ✅

## Rollback Plan
Revert schema + contract + script/test changes. Generated artifacts (.automation/WHERE_AM_I.json) unaffected.
