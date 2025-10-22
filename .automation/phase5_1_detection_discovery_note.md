# Phase 5.1 – Evidence Detection Discovery Note

## Objective
Implement the read-only evidence detection capability described in `docs/05_151024_todays_status.md/07_automating_gates_ledger_updates.md` for Phase 5.1. The goal is to parse recent workflow action logs and surface gate evidence without mutating `.automation/GATES_LEDGER.md`.

## Integration Points

1. **Action Log Generation**
   - File: `src/telemetry/events.ts`
   - Snippet:
     ```ts
     const ACTION_LOG_FILE = path.join(AUTOMATION_DIR, "actions.jsonl");
     if (actionLogEnabled()) {
       await fs.appendFile(ACTION_LOG_FILE, `${JSON.stringify(traceEntry)}\n`, "utf-8");
     }
     ```
   - Notes: Evidence detection must tolerate the log being disabled (flag `ACTION_LOG_JSONL`). Fallback to `execution_trace.jsonl` when the JSONL log is absent.

2. **Workflow CLI (State Runner)**
   - File: `scripts/execute-next-action.js`
   - Snippet:
     ```js
     const result = await executeCommand(action.command, false);
     if (result.success) {
       console.log('\n✅ Action completed successfully!');
     }
     ```
   - Notes: Phase 5.1 remains read-only, so no changes are made here yet. Future phases will hook detection after command execution.

3. **NPM Script Surface Area**
   - File: `package.json`
   - Snippet:
     ```json
     "scripts": {
       "state:next": "tsx scripts/execute-next-action.js --interactive"
     }
     ```
   - Notes: Add a dedicated `evidence:detect` entry that runs the new detector for manual verification.

## Proposed Additions

- New script: `scripts/detect-evidence.js`
  - Responsibilities: read `.automation/actions.jsonl` (or fallback to `execution_trace.jsonl`), parse JSONL entries, and map commands/exit codes to gate criteria described in Phase 5 docs.
  - Output: console report (text/JSON) summarizing detected evidence. No ledger mutation.
- Unit tests: `tests/workflow/detectEvidence.test.ts` exercising command matching, exit code filtering, and combined evidence (SBOM + provenance).

## Dependencies & Constraints

- No new npm dependencies required. Use Node.js standard library for file IO.
- Keep script ESM-compatible (repository `"type": "module"`).
- Respect feature flag: if `.automation/actions.jsonl` is missing, detection should still operate on available data without failing.

## Risk Assessment

- **Low**: Read-only operations with graceful degradation if logs missing or malformed.
- Logging must handle corrupted lines without exiting non-zero to remain safe for integration into later automation phases.

## Validation Plan

1. Create sample JSONL entries in tests to verify detection mapping.
2. Run `npm test` to ensure new tests pass.
3. Manually execute `npm run evidence:detect` (after implementation) to confirm CLI output when logs exist.
