 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md b/WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md
new file mode 100644
index 0000000000000000000000000000000000000000..a62fb4d4f3f50f465f9a5ac2369e632e09c47e7b
--- /dev/null
+++ b/WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md
@@ -0,0 +1,88 @@
+# Workflow Phases 1-4 Remediation Plan
+
+**Validator:** gpt-5-codex  
+**Date:** 2025-10-15  
+**Objective:** Restore clean separation between Workflow tooling and the Executor MVP product runtime, and close evidence gaps surfaced during validation.
+
+---
+
+## 1. Issue Prioritization
+| Priority | Issue | Evidence | Impact |
+| --- | --- | --- | --- |
+| P0 | Workflow metadata embedded in product runtime (`src/server.ts`) | Workflow imports + `/api/workflow/status` endpoint in product server | High — violates governance, leaks developer metadata to end-user APIs【F:src/server.ts†L82-L179】【F:src/server.ts†L2304-L2319】 |
+| P0 | Shared workflow module coupled to product (`src/state/phaseState.ts`) | Workflow library lives under `src/` and is imported by both CLI and server | High — enables future cross-track drift, blocks clean decoupling【F:src/state/phaseState.ts†L53-L315】【F:src/server.ts†L82-L170】 |
+| P1 | Contract tasks missing `validation_results` evidence | Contract JSON lacks persisted validation outputs; validator warns | Medium — weakens audit trail and contract trustworthiness【F:contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json†L417-L506】【ee84c2†L1-L37】 |
+| P2 | Tests enforce contaminated API behavior | `tests/api/workflow-status.test.ts` expects workflow metadata from product endpoint | Medium — prevents removal of contamination without test redesign【F:tests/api/workflow-status.test.ts†L11-L188】 |
+
+---
+
+## 2. Remediation Steps
+
+### 2.1 Remove Workflow Metadata from Product Runtime (Priority P0)
+1. **Delete workflow imports from `src/server.ts`:**
+   - Remove `loadPhaseState`, `buildWorkflowMetadata`, and associated types from server imports.【F:src/server.ts†L82-L138】
+   - Remove `WorkflowCacheEntry`, `workflowMetadataCache`, and `ensureWorkflowMetadataForSession` helpers that currently cache workflow metadata inside the product runtime.【F:src/server.ts†L124-L179】
+2. **Refactor `ProgressSnapshot`:**
+   - Drop the `workflowMetadata` property from the product snapshot type to avoid mixing tracks.【F:src/server.ts†L124-L138】
+   - Audit downstream consumers (progress APIs, SSE streams) to ensure they no longer expect workflow metadata fields.
+3. **Remove `/api/workflow/status` from server:**
+   - Delete the endpoint and export it to a dedicated workflow CLI/utility if still needed by developers.【F:src/server.ts†L2304-L2319】
+   - Communicate the removal in changelog/AGENTS instructions so developers know to rely on `npm run state:show` instead.
+4. **Risk Mitigation:**
+   - Ensure product clients (UI, API consumers) do not depend on workflow metadata by running regression tests after removal (`npm test`, UI smoke tests).【df0250†L1-L74】
+
+### 2.2 Isolate Workflow Library (Priority P0)
+1. **Relocate `src/state/phaseState.ts`:**
+   - Move workflow-specific logic under a workflow-specific directory (e.g., `workflow/phaseState.ts` or `scripts/lib/phaseState.js`) so product TypeScript cannot import it accidentally.【F:src/state/phaseState.ts†L53-L315】
+   - Adjust CLI scripts (`snapshot-state.js`, `sync-contract-status.js`, `execute-next-action.js`) to import from the new location.【F:scripts/snapshot-state.js†L1-L200】【F:scripts/sync-contract-status.js†L1-L200】【F:scripts/execute-next-action.js†L1-L199】
+2. **TypeScript Boundary:**
+   - If TypeScript types are still desired for workflow modules, create a separate `tsconfig.workflow.json` to build workflow utilities independently, keeping them out of the product compilation pipeline.
+3. **Documentation Update:**
+   - Add an explicit note to `WHAT_IS_WHAT.md` or AGENTS instructions documenting the new workflow module location and reiterating track boundaries.【F:WHAT_IS_WHAT.md†L11-L189】
+
+### 2.3 Capture Validation Evidence (Priority P1)
+1. **Enhance `sync-contract-status.js`:**
+   - Persist the commands executed for each task into `validation_results` when marking tasks complete. This can be done by capturing command output + timestamps before returning `status: "complete"`.【F:scripts/sync-contract-status.js†L156-L199】
+2. **Update Contract JSON:**
+   - Re-run `npm run state:sync` after code changes to repopulate validation results and ensure contract warnings disappear.【62d4bf†L1-L3】【ee84c2†L1-L37】
+3. **Regression Tests:**
+   - Extend `tests/state/sync.test.ts` to assert that completed tasks include non-empty `validation_results` after sync operations.【F:tests/state/sync.test.ts†L1-L120】
+
+### 2.4 Adjust Test Coverage (Priority P2)
+1. **Remove workflow API expectations:**
+   - Delete or rewrite `tests/api/workflow-status.test.ts` to reflect the absence of `/api/workflow/status` in the product runtime. If developer tooling still needs an HTTP interface, spin up a dedicated workflow-only server or expose fixtures under `scripts/` for testability.【F:tests/api/workflow-status.test.ts†L11-L188】
+2. **Add Workflow CLI Tests:**
+   - Ensure workflow functionality remains validated via CLI-level tests (existing `tests/state/*.test.ts` already cover core logic). Adjust them if module paths change.
+
+---
+
+## 3. Effort & Risk Assessment
+| Task | Est. Effort | Risk Level | Mitigation |
+| --- | --- | --- | --- |
+| Server decoupling & endpoint removal | 1-2 days | Medium | Run full test suite, coordinate with UI team to confirm no dependency on workflow metadata. | 
+| Workflow module relocation | 0.5-1 day | Low | Ensure build/test configs updated; no runtime impact on product once imports removed. |
+| Validation evidence capture | 0.5 day | Low | Unit tests enforce presence of `validation_results`. |
+| Test suite adjustments | 0.5 day | Low | Remove obsolete API tests, rely on CLI tests. |
+
+---
+
+## 4. Follow-Up Verification
+After remediation, rerun the full validation checklist:
+- `npm run state:show`
+- `npm run state:sync`
+- `npm run state:next:dry`
+- `npm run lint`
+- `npm run typecheck`
+- `npm test`
+- `npm run contract:check`
+- `npm run sbom`
+- `npm run sbom:cyclonedx`
+- `npm run sbom:all`
+- `npm run provenance`
+
+Capture outputs to confirm no contamination warnings remain and that contract validation passes without evidence gaps.
+
+---
+
+## 5. Summary
+Addressing the high-priority items (server decoupling + module isolation) restores the strict separation mandated in the governance docs. Secondary tasks (evidence capture, test updates) reinforce auditability and prevent regressions. Completion of this plan should unblock future workflow automation without risking product API clarity.
diff --git a/WORKFLOW_PHASES_1-4_VALIDATION_REPORT.md b/WORKFLOW_PHASES_1-4_VALIDATION_REPORT.md
new file mode 100644
index 0000000000000000000000000000000000000000..0d5c70dd3635b43389b86e8a743f638b71f50964
--- /dev/null
+++ b/WORKFLOW_PHASES_1-4_VALIDATION_REPORT.md
@@ -0,0 +1,88 @@
+# Workflow Phases 1-4 Validation Report
+
+**Validator:** gpt-5-codex  
+**Date:** 2025-10-15  
+**Scope:** Verify Workflow Phases 1-4 implementation against checklist in `docs/05_151024_todays_status.md/03_phase1-p4_WF_validation_checklist.md` and identify any cross-track contamination between Workflow tooling and the Executor MVP product runtime.
+
+---
+
+## 1. Executive Summary
+- **Phase 1 (Snapshot CLI):** ✅ Compliant. The snapshot script is a standalone Node CLI that reads ledger + contract data, exposes optional validation hooks, and the generated artifact remains gitignored. Commands and targeted Vitest coverage executed successfully.【F:scripts/snapshot-state.js†L1-L200】【9d8e7b†L32-L37】【6b1f23†L1-L63】【df0250†L1-L74】
+- **Phase 2 (Contract Sync):** ⚠️ Partial. The sync script performs the required evidence regeneration and contract updates, but contract tasks show no `validation_results`, triggering warnings in the contract validator. Functionally the command succeeds, yet evidence recording gaps remain.【F:scripts/sync-contract-status.js†L1-L200】【ee84c2†L1-L37】【369d0e†L1-L10】【b3ce25†L417-L506】
+- **Phase 3 (Workflow ↔ Product integration):** ❌ Contaminated. `src/server.ts` imports the workflow state module, caches workflow metadata alongside product progress snapshots, and ships a `/api/workflow/status` endpoint from the product server, contradicting the track separation guidance in `WHAT_IS_WHAT.md`. Tests in `tests/api/workflow-status.test.ts` assert exposure of developer-only metadata to product clients.【F:src/server.ts†L82-L179】【F:src/server.ts†L2304-L2319】【F:tests/api/workflow-status.test.ts†L1-L200】【F:WHAT_IS_WHAT.md†L11-L189】
+- **Phase 4 (Autonomous executor CLI):** ⚠️ Partial. The CLI respects safety rails and only uses workflow state, but it depends on the contaminated shared module (`src/state/phaseState.ts`) that now serves both the CLI and product server. Dry-run command works as expected.【F:scripts/execute-next-action.js†L1-L199】【e521f6†L1-L18】
+- **Track Verdict:** **CONTAMINATED.** Workflow metadata has been embedded into the Executor MVP runtime (server + API surface), violating the separation mandate.
+
+---
+
+## 2. Methodology
+1. **Required Reading:** Reviewed `WHAT_IS_WHAT.md`, Phase 19 documentation, and the Phase 1-4 validation checklist to understand intended track boundaries and deliverables.【F:WHAT_IS_WHAT.md†L11-L189】
+2. **Code Inspection:** Audited each script/module listed in the checklist, focusing on integration points and shared imports.【F:scripts/snapshot-state.js†L1-L200】【F:scripts/sync-contract-status.js†L1-L200】【F:src/state/phaseState.ts†L1-L315】【F:src/server.ts†L82-L179】
+3. **Command Execution:** Ran every checklist command (state scripts, validations, full test suite, contract check, SBOM/Provenance) and captured outputs for evidence.【6b1f23†L1-L63】【df0250†L1-L74】【62d4bf†L1-L3】【e521f6†L1-L18】【cc8a41†L1-L4】【1d326d†L1-L4】【8a8bc9†L1-L5】【ee84c2†L1-L37】【87bdcc†L1-L6】【1e1d5e†L1-L9】【d724bd†L1-L11】【0e6282†L1-L12】
+4. **Data Review:** Verified contract status fields, ledger gating, and gitignore settings to ensure artefact handling complies with expectations.【F:contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json†L1-L520】【F:.automation/GATES_LEDGER.md†L11-L118】【9d8e7b†L32-L37】
+
+---
+
+## 3. Phase-by-Phase Findings
+
+### 3.1 Phase 1 — Read-Only Snapshot System
+- **Implementation Review:** `scripts/snapshot-state.js` is an ESM Node CLI that only touches filesystem/child_process APIs. It reads `.automation/GATES_LEDGER.md`, resolves the Phase 19 contract, inspects git status, and can optionally run validations; no imports from `src/` exist.【F:scripts/snapshot-state.js†L1-L200】
+- **Artifact Handling:** `.automation/WHERE_AM_I.json` remains gitignored, preventing accidental commits.【9d8e7b†L32-L37】
+- **Runtime Verification:** `npm run state:show` produced the expected JSON snapshot with gates, tasks, validation summary, and suggested action data.【6b1f23†L1-L63】
+- **Testing:** Running `npm test` (with coverage enabled) executed `tests/state/snapshot.test.ts`, confirming the CLI prints a parseable JSON snapshot with required keys.【df0250†L1-L74】
+- **Assessment:** **Compliant.** No product integration detected.
+
+### 3.2 Phase 2 — Contract Status Sync
+- **Implementation Review:** `scripts/sync-contract-status.js` regenerates CycloneDX SBOMs, SLSA provenance, reruns test validations, and writes updates back into the contract JSON. All operations occur via Node stdlib and npm scripts; no server integration found.【F:scripts/sync-contract-status.js†L1-L200】
+- **Runtime Verification:** `npm run state:sync` completed and reported the contract already in sync, implying idempotence after earlier runs.【62d4bf†L1-L3】
+- **Contract State:** Phase 19 contract tasks are all marked `"status": "complete"` with timestamps but have empty `validation_results` arrays, which surfaces as warnings during `npm run contract:check`.【F:contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json†L417-L506】【ee84c2†L1-L37】
+- **Testing:** `npm test` run covers `tests/state/sync.test.ts`, verifying evidence regeneration and idempotence, though the absence of persisted validation results remains unresolved.【df0250†L1-L74】【F:tests/state/sync.test.ts†L1-L120】
+- **Assessment:** **Issues Identified (Partial).** Functional goals met, but evidence recording is incomplete (missing validation logs).
+
+### 3.3 Phase 3 — Orchestrator Integration (Contamination Check)
+- **Planned Intent:** Workflow metadata should remain a developer aid. `WHAT_IS_WHAT.md` explicitly categorizes `src/server.ts` as product runtime, while `src/state/phaseState.ts` belongs to the workflow track.【F:WHAT_IS_WHAT.md†L82-L153】
+- **Observed Implementation:**
+  - `src/server.ts` imports workflow helpers (`loadPhaseState`, `buildWorkflowMetadata`) and aliases workflow types into product-only `ProgressSnapshot` definitions.【F:src/server.ts†L82-L138】
+  - Workflow metadata is cached per execution session and appended to every product progress snapshot via `workflowMetadataCache` and `ensureWorkflowMetadataForSession`.【F:src/server.ts†L124-L179】
+  - The server exposes `/api/workflow/status`, returning workflow metadata (gates, tasks, suggested actions).【F:src/server.ts†L2304-L2319】
+  - API tests assert that clients receive workflow-specific fields (gates, current tasks, human summary), cementing the contamination contract.【F:tests/api/workflow-status.test.ts†L11-L188】
+- **Track Analysis:** Exposing developer roadmap data through the product server contradicts the repository's "two separate things" directive and confuses end-user APIs with developer workflow tooling.【F:WHAT_IS_WHAT.md†L11-L189】
+- **Assessment:** **Contaminated.** Workflow tooling is embedded inside the Executor MVP runtime and publicly accessible endpoints, violating track separation.
+
+### 3.4 Phase 4 — Autonomous Next Action Executor
+- **Implementation Review:** The CLI loads workflow state, evaluates suggested next actions, enforces safety checks (blocking `git push`, `rm -rf`, etc.), and supports dry-run mode. It only shells out when explicitly confirmed.【F:scripts/execute-next-action.js†L1-L199】
+- **Runtime Verification:** `npm run state:next:dry` displayed workflow context and the suggested git command without executing it, honoring dry-run expectations.【e521f6†L1-L18】
+- **Dependency Note:** The CLI depends on `src/state/phaseState.ts`, the same module currently shared with the contaminated product server. Isolating workflow libraries from product imports is required to maintain clean boundaries.【F:src/state/phaseState.ts†L53-L315】【F:src/server.ts†L82-L170】
+- **Assessment:** **Partial.** CLI behavior is correct, but it relies on the same shared module that is misused by the product runtime.
+
+---
+
+## 4. Track Contamination Verdict
+- **Status:** **CONTAMINATED**
+- **Evidence:** Product server (`src/server.ts`) now imports and exposes workflow metadata through runtime state, contradicting governance documentation.【F:src/server.ts†L82-L179】【F:src/server.ts†L2304-L2319】【F:WHAT_IS_WHAT.md†L11-L189】
+- **Impact:**
+  - End-user APIs leak developer-focused workflow information (gates, suggested next actions).
+  - Progress snapshots mix product execution state with workflow metadata, risking broken contract expectations for product consumers.
+  - Workflow tests enforce the contaminated behavior, making remediation non-trivial.【F:tests/api/workflow-status.test.ts†L1-L188】
+
+---
+
+## 5. Evidence Bundle
+- **Commands:** `npm run state:show`, `npm run state:sync`, `npm run state:next:dry`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run contract:check`, `npm run sbom`, `npm run sbom:cyclonedx`, `npm run sbom:all`, `npm run provenance`. Outputs captured in chunks referenced throughout this report.【6b1f23†L1-L63】【62d4bf†L1-L3】【e521f6†L1-L18】【cc8a41†L1-L4】【1d326d†L1-L4】【df0250†L1-L74】【ee84c2†L1-L37】【87bdcc†L1-L6】【1e1d5e†L1-L9】【d724bd†L1-L11】【0e6282†L1-L12】
+- **Source Citations:** Inline references highlight every inspected file and relevant line range.
+
+---
+
+## 6. Outstanding Issues Summary
+1. **Track Contamination:** Workflow metadata embedded in product runtime; `/api/workflow/status` exposes developer tooling data to end users.【F:src/server.ts†L82-L179】【F:src/server.ts†L2304-L2319】
+2. **Shared Module Coupling:** `src/state/phaseState.ts` serves both workflow CLIs and product server, encouraging cross-track drift.【F:src/state/phaseState.ts†L53-L315】
+3. **Missing Validation Evidence:** Contract tasks lack persisted `validation_results`, yielding warnings in `npm run contract:check`. Workflow sync script should capture these results or justification documents.【F:contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json†L417-L506】【ee84c2†L1-L37】
+
+---
+
+## 7. Conclusion
+Phases 1 and 2 achieve their functional goals, and Phase 4 delivers a safe automation CLI, but Phase 3 introduces a severe separation-of-concerns violation. Remediation must prioritize removing workflow metadata from the product server and restoring clean track boundaries before further workflow automation can be considered trustworthy.
+
+---
+
+*See `WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md` for recommended corrective actions.*
 
EOF
)