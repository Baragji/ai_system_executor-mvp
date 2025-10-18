# P19-V05 — Discovery Note: Run tests and capture LangGraph parity evidence

Date: 2025-10-25
Scope: Phase 19 Task P19-V05 — validate the LangGraph runtime end-to-end under the feature flag, collect lint/typecheck health, and document evidence for Gate G3.

## Integration Points

- `package.json`
  - Defines `npm test`, `npm run lint`, and `npm run typecheck` scripts required by the contract validation checklist.
- `tests/api/executions.test.ts`
  - Provides targeted coverage for `/api/execute` when `AGENTS_RUNTIME=langgraph`, ensuring execution polling converges to `completed` with logs populated.
- `src/server.ts`
  - Emits the diagnostic runtime selection log and orchestrates the execution store lifecycle that validation commands rely on.
- `.automation/evidence/langgraph/`
  - Houses per-task evidence markdown; this task must add validation outputs and runtime log excerpts demonstrating parity.
- `.automation/progress_phase19_langgraph_runtime.json`
  - Records command outputs and evidence references for each task; must reflect the validations executed for P19-V05.

## Observations

- Existing Vitest suites include the word "execute" in their descriptions, so `npm test -- -t execute` will target the relevant cases without running the entire suite.
- Linting uses the flat config (`eslint.config.js`) and completes within seconds; capturing the command output ensures the contract's lint requirement is met.
- Type checking relies on `tsc --noEmit` via `npm run typecheck`; failures here would indicate incompatible LangGraph typings or regressions introduced by server wiring.

## Risks

- Running only focused tests may miss regressions outside the filtered subset; however the contract explicitly calls for the targeted command.
- Forgetting to export `AGENTS_RUNTIME=langgraph` when running tests would accidentally exercise the legacy path, invalidating the evidence.
- Evidence files must cite relevant code or command output; missing citations could block contract closure.

## Next Steps

1. Execute the required validation commands with `AGENTS_RUNTIME=langgraph` set and capture their outputs.
2. Collect a console log snippet showing the runtime selection to demonstrate the flag path in action.
3. Write evidence notes summarizing the results with citations.
4. Update the phase progress tracker and contract record to mark the task complete.
