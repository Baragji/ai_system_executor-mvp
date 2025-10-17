Title: Resolve src/server.ts merge conflict by standardizing on WorkflowMetadata

Summary
- Conflict markers in `src/server.ts` blocked typecheck (see docs/merge_conflict.md). Two competing implementations existed:
  - Ours: `WorkflowContext` with `phaseState`, `nextAction`, `humanSummary`, etc.
  - Theirs: `WorkflowMetadata` produced via `buildWorkflowMetadata()` from `src/state/phaseState.ts`.
- Resolution: Adopt `WorkflowMetadata` end-to-end. This aligns with ADR-019 and tests expecting `workflowMetadata` on progress snapshots/SSE.

Integration Points
- File: `src/server.ts:85` import block — use `loadPhaseState`, `buildWorkflowMetadata`, `type WorkflowMetadata` from `./state/phaseState.js`.
- File: `src/server.ts` workflow caches and accessors
  - Define `workflowMetadataCache: Map<string, WorkflowMetadata>`.
  - `ensureWorkflowMetadataForSession(sessionId)` builds with `buildWorkflowMetadata(state, { uncommittedChanges, computedAt })`.
  - Provide `getWorkflowMetadata()`, `clearWorkflowMetadata()`.
- File: `src/server.ts` progress model
  - `type ProgressSnapshot` includes `workflowMetadata?: WorkflowMetadata` (removed `workflow?: WorkflowContext`).
  - `setProgress()`, `getProgress()`, `snapshotFromSession()` attach `workflowMetadata` when available.
- File: `src/server.ts` API touchpoints
  - `/api/execute`, `/api/sessions/:id/pause`, `/api/sessions/:id/resume` call `ensureWorkflowMetadataForSession()`.
- File: `src/server.ts` test helpers
  - `__progressTest` exposes `ensureMetadata()`, `snapshot()`, and a `clear()` that resets both `progressSessions` and `workflowMetadataCache`.

Removed/Deprecated
- Removed local `WorkflowContext` type and related logic using `suggestNextAction` and `formatHumanSummary` directly; these are now encapsulated by `buildWorkflowMetadata`.

Justification
- Single source of truth for phase state view (`WorkflowMetadata`) improves consistency and aligns with the recent state module (`src/state/phaseState.ts`).
- Tests explicitly assert presence of `workflowMetadata` in progress SSE and snapshot endpoints.
- Minimizes surface area and avoids duplicated logic.

Compliance Check (ai-stack.json constraints)
- Language/Stack: TypeScript/Node.js only — OK.
- No new dependencies introduced — OK.
- Backend Express only, no frontend changes — OK.
- Error handling unchanged; RFC9457 helpers still used — OK.
- No breaking API of existing endpoints; conflict was internal; SSE payload now consistently includes `workflowMetadata` as established by tests — OK.

Validation Evidence
- `npm run lint` — passed with 0 warnings.
- `npm run typecheck` — passed.
- `npm test` — all tests passed, coverage above thresholds.

Potential Impacts
- Downstream consumers expecting the legacy `workflow` field should switch to `workflowMetadata`. Test suite already targets `workflowMetadata`.

