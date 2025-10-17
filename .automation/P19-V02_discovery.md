# P19-V02 — Discovery Note: Install LangGraph runtime dependencies

Date: 2025-10-17
Scope: Phase 19 Task P19-V02 — install LangGraph runtime dependencies and update package metadata with justification and evidence.

## Integration Points

- `package.json`
  - Adds `@langchain/langgraph` and `@langchain/core` under runtime dependencies with exact versions.
  - Current dependency block lists orchestrator stack libraries but no LangChain packages yet:
    ```json
    "dependencies": {
      "bullmq": "^5.61.0",
      "openai": "^4.57.0"
    }
    ```
- `package-lock.json`
  - Must capture resolved versions and integrity hashes for the new packages plus their transitive graph.
  - Existing lockfile has no entries for `node_modules/@langchain/*`.
- `.automation/evidence/langgraph/`
  - Requires a new evidence note detailing dependency rationale, versions selected, and validation results per contract.
- `.automation/progress_phase19_langgraph_runtime.json`
  - Progress tracker needs a new entry for P19-V02 with timestamps, validation status, and evidence references.

## Observations

- `npm view @langchain/langgraph version` reports `0.4.9`; `npm view @langchain/core version` reports `1.0.0`. These will be locked via `npm install --save-exact` to satisfy the "exact versions" success criterion.
- Both packages target Node 18+ and rely on `langchain` split modules; no conflicting peer dependencies are listed in npm metadata, but the install may introduce shared transitive packages (e.g., `zod`, `p-queue`). Need to confirm none violate stack constraints.
- Repo already enforces Rollup WASM optional dependency via test shim; installing new packages must not disturb that configuration.

## Proposed Implementation

1. Run `npm install --save-exact @langchain/langgraph @langchain/core` to add runtime dependencies and update the lockfile deterministically.
2. Verify `package.json` shows both packages without caret ranges and confirm no unintended script or config drift.
3. Capture dependency justification, version numbers, and npm output excerpt in a new evidence markdown under `.automation/evidence/langgraph/`.
4. Update `.automation/progress_phase19_langgraph_runtime.json` with the task status, command validation (`test -f package-lock.json`), and evidence pointer.
5. Run `test -f package-lock.json` to satisfy the contract validation step and include the result in evidence.

## Compliance

- Language/Stack: Node.js + TypeScript only — ✅ (dependency metadata updates only).
- No protected files modified (`ai-stack.json`, workflows, contracts) — ✅.
- Discovery-first protocol satisfied via this note (paired JSON to follow) — ✅.
- Tests/lint unaffected but will rerun contract validation command post-install — ✅.
