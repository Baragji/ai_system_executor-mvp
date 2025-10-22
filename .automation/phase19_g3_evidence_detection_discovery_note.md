# Phase 19 — G3 Evidence Detection & Workflow Suggestions

## Goal
- Detect deterministic replay, parity, and performance benchmark test runs as evidence for Gate G3 criteria.
- Update workflow suggestions so new LangGraph validation tests are executed before committing pending changes.

## Integration Points
- `scripts/detect-evidence.js` — builds canonical evidence detection rules
  - Current rules only cover SBOM, provenance, and a LangGraph integration test command.
  - Snippet:
    ```js
    if (CRITERIA.langgraph) {
      DETECTION_RULES.push({
        gate: "G3",
        criterion: CRITERIA.langgraph,
        matches: entry =>
          entry.success &&
          commandContainsAll(entry.command, [
            "AGENTS_RUNTIME=langgraph",
            "npm test",
            "tests/api/executions.test.ts"
          ])
      });
    }
    ```
- `scripts/snapshot-state.js` — synthesizes workflow state and suggests next action
  - Suggestion heuristics return `COMMIT_PENDING_CHANGES` whenever uncommitted files exist, even if new tests are present.
  - Snippet:
    ```js
    if (uncommitted.length > 0) {
      const testChanges = uncommitted.some((l) => /\stests\//.test(l));
      return {
        action: testChanges ? 'COMMIT_PENDING_TESTS' : 'COMMIT_PENDING_CHANGES',
        reasoning: 'Uncommitted changes detected. Commit to persist progress.',
        command: "git add -A && git commit -m 'chore: persist progress'",
      };
    }
    ```
- `tests/scripts/detect-evidence.test.ts` — validates evidence detection behaviours
  - Needs new expectations for replay, parity, and performance test commands mapping to the correct G3 criteria text.
- `tests/state/execute-next-action.test.ts` — ensures CLI suggestions enumerate supported actions
  - Will require assertions covering the new action types for running LangGraph validation tests.

## Proposed Changes
- Extend `scripts/detect-evidence.js` to load canonical G3 criteria text for deterministic replay, performance benchmarks, and parity tests.
- Add detection rules that match successful `npm test` invocations for `tests/orchestrator/replay.test.ts`, `tests/orchestrator/parity.test.ts`, and `tests/benchmarks/perf-overhead.test.ts`.
- Update `scripts/snapshot-state.js` to parse outstanding G3 acceptance criteria, detect when the associated test files exist, and recommend running the missing validations before suggesting commits.
- Introduce descriptive action identifiers (e.g., `RUN_DETERMINISTIC_REPLAY_TESTS`) and commands for each outstanding validation.
- Expand unit tests to cover the new detection rules and workflow suggestions, keeping safety guarantees intact.

## Dependencies / Impacts
- Relies on `.automation/GATES_LEDGER.md` remaining the canonical source for criterion text via `workflow/lib/gateCriteria.js`.
- `actions.jsonl` logging already captures executed commands from `execute-next-action`; new suggestions will leverage this path to record evidence.
- No additional packages required.

## Compliance Check
- Language: TypeScript/JavaScript ✅
- Backend: Node.js tooling only ✅
- Frontend: untouched ✅
- Testing: Vitest suites updated ✅
- Linting: existing ESLint rules apply ✅
