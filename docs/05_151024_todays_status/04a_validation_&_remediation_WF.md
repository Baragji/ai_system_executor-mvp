 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md b/WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md
new file mode 100644
index 0000000000000000000000000000000000000000..0bcc249c32be85fac5a91a8be6367d3944f04123
--- /dev/null
+++ b/WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md
@@ -0,0 +1,75 @@
+# Workflow Phases 1-4 Remediation Plan
+
+## Issue Log
+### WF3-001 — Workflow metadata embedded in product progress sessions
+- **Severity:** 🔴 Critical
+- **Category:** Track Contamination
+- **Evidence:**
+  - `src/server.ts` imports workflow helpers and widens `ProgressSnapshot` with `workflowMetadata`.【F:src/server.ts†L85-L138】
+  - Metadata cache populates from `loadPhaseState()` and `buildWorkflowMetadata()` during product session tracking.【F:src/server.ts†L154-L177】
+  - `setProgress()` persists workflow metadata into progress payloads delivered to end users.【F:src/server.ts†L260-L293】
+  - Documentation states workflow tooling is for developers, not product runtime.【F:WHAT_IS_WHAT.md†L9-L112】【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L150-L186】
+- **Why this is wrong:** Progress SSE/REST endpoints belong to the Executor MVP product; embedding workflow metadata exposes developer guidance to end users and violates the strict track separation defined in `WHAT_IS_WHAT.md` and the confusion analysis.
+- **Impact:** Product API responses now leak internal workflow state, coupling developer tooling to runtime behavior and risking user-facing confusion or security exposure.
+- **Remediation:**
+  - [ ] Remove the workflow imports, `WorkflowCacheEntry` type alias, metadata cache, and `workflowMetadata` fields from `src/server.ts`.
+  - [ ] Ensure progress snapshots contain only product-oriented fields (stage, progress, orchestrator state).
+  - [ ] Keep workflow guidance accessible via CLI tooling (Phase 1/4 commands) or move to a dedicated developer-only surface outside `src/` if still required.
+- **Steps to fix:**
+  1. Delete workflow-specific imports and types from `src/server.ts`.
+  2. Remove `workflowMetadataCache`, helper functions, and spreads in `setProgress()`/`getProgress()`.
+  3. Update any dependent TypeScript definitions/tests accordingly.
+  4. Re-run lint, typecheck, and tests to confirm product endpoints remain functional.
+- **Estimated effort:** 4 hours
+- **Priority:** 1 (highest)
+
+### WF3-002 — `/api/workflow/status` exposed via product server
+- **Severity:** 🔴 Critical
+- **Category:** Track Contamination
+- **Evidence:** Product server registers `/api/workflow/status` and responds with workflow metadata assembled from `loadPhaseState()`.【F:src/server.ts†L2304-L2319】
+- **Why this is wrong:** Workflow status is intended for developers (CLI tooling). Serving it from the product Express app conflates developer tooling with user APIs, conflicting with track separation guidelines.【F:WHAT_IS_WHAT.md†L9-L112】【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L150-L186】
+- **Impact:** Exposes internal contracts, gate status, and suggested developer actions over the public API surface; encourages further contamination.
+- **Remediation:**
+  - [ ] Remove the `/api/workflow/status` route from `src/server.ts`.
+  - [ ] If a REST surface is needed, re-implement it as a standalone workflow CLI/utility (e.g., `scripts/workflow-status.js`) that runs outside the product server.
+- **Steps to fix:**
+  1. Delete the route handler and related helper calls in `src/server.ts`.
+  2. Adjust any references in documentation or tooling to use CLI commands instead (e.g., `npm run state:show`).
+  3. Update tests to reflect the removal (see WF3-003).
+- **Estimated effort:** 2 hours
+- **Priority:** 1
+
+### WF3-003 — API test suite asserts workflow metadata over HTTP
+- **Severity:** ⚠️ High
+- **Category:** Track Contamination
+- **Evidence:** `tests/api/workflow-status.test.ts` exercises `/api/workflow/status` and checks workflow-specific fields.【F:tests/api/workflow-status.test.ts†L1-L200】
+- **Why this is wrong:** Embedding workflow expectations in the product API test suite cements the contamination and forces future contributors to maintain the wrong coupling.
+- **Impact:** Prevents removal of contaminated endpoints without breaking tests; increases risk that workflow tooling remains mixed into product CI signals.
+- **Remediation:**
+  - [ ] Delete or relocate this test to a workflow-specific test harness (e.g., tests that execute CLI scripts) once `/api/workflow/status` is removed.
+  - [ ] Replace with tests validating the CLI output if coverage is desired.
+- **Steps to fix:**
+  1. Remove `tests/api/workflow-status.test.ts` after addressing WF3-002.
+  2. Optionally add a new test under `tests/state/` that invokes `npm run state:show` to ensure workflow metadata stays correct.
+- **Estimated effort:** 1 hour
+- **Priority:** 2
+
+## Priority Matrix
+| Priority | Category              | Count | Est. Effort |
+|----------|-----------------------|-------|-------------|
+| P1       | Track Contamination   | 2     | 6 hours     |
+| P2       | Track Contamination   | 1     | 1 hour      |
+| P3       | –                     | 0     | 0 hours     |
+| P4       | –                     | 0     | 0 hours     |
+
+## Rollback vs Fix Decisions
+- **WF3-001:** Rollback contamination (remove workflow metadata from server). Fix required before continuing Phase 3 work.
+- **WF3-002:** Rollback endpoint from product server; recreate as workflow CLI if needed.
+- **WF3-003:** Remove product API test; replace with workflow-tooling coverage as needed.
+
+## Risks & Notes
+- Removing contamination may require updating frontend components if they currently consume `workflowMetadata`. Validate UI usage before deleting fields.
+- Contract validator warnings (missing `validation_results`) remain informational but should be revisited after cleanup to ensure future automation captures evidence properly.【fc223f†L25-L48】
+
+---
+*Prepared by: Validator (Workflow Phases 1-4 audit)*
diff --git a/WORKFLOW_PHASES_1-4_VALIDATION_REPORT.md b/WORKFLOW_PHASES_1-4_VALIDATION_REPORT.md
new file mode 100644
index 0000000000000000000000000000000000000000..e7cf2e8b6d6f76032e2d5059d5b7534275581523
--- /dev/null
+++ b/WORKFLOW_PHASES_1-4_VALIDATION_REPORT.md
@@ -0,0 +1,84 @@
+# Workflow Phases 1-4 Validation Report
+
+## 1. Executive Summary
+- **Overall verdict:** ❌ **Fail** – workflow tooling is contaminating the Executor MVP runtime.
+- **Issues found:** 4 total (3 🔴 critical track-contamination, 1 ⚠️ high track-contamination).
+- **Track contamination:** YES – workflow metadata is imported into product server endpoints and validated in API tests.【F:src/server.ts†L85-L314】【F:tests/api/workflow-status.test.ts†L1-L200】
+- **Coverage & quality:** Test suite passes with 84.16% line / 78.02% branch coverage (meets thresholds).【ef51e5†L73-L103】 Lint, typecheck, and contract validation succeed, though the contract checker reports missing validation evidence entries.【a88f1e†L1-L5】【492aec†L1-L5】【fc223f†L1-L52】
+
+## 2. Phase-by-Phase Assessment
+### Phase 1 – Read-Only Snapshot System
+- **Implementation review:** `scripts/snapshot-state.js` parses gates, contracts, git status, and emits JSON without server integration.【F:scripts/snapshot-state.js†L1-L224】 The companion test validates the CLI output structure.【F:tests/state/snapshot.test.ts†L1-L33】 `.automation/WHERE_AM_I.json` is gitignored.【F:.gitignore†L37-L39】
+- **Commands verified:**
+  - `npm run state:show` prints a full snapshot with gates, sync status, and suggested next action.【10dfd6†L1-L53】
+  - Targeted test command executed (triggered full suite due to harness) – snapshot test passed within global run.【52c23d†L67-L107】
+- **Result:** ✅ **Compliant** – CLI-only behavior matches the plan, no runtime coupling observed.
+
+### Phase 2 – Contract Status Sync
+- **Implementation review:** `scripts/sync-contract-status.js` regenerates CycloneDX, provenance, runs task validations, and updates contract timestamps.【F:scripts/sync-contract-status.js†L1-L200】 Tests assert evidence regeneration and idempotence.【F:tests/state/sync.test.ts†L1-L135】 `state:sync` command present in `package.json`.【F:package.json†L31-L37】
+- **Commands verified:**
+  - `npm run state:sync` completed with "Contract already in sync" after executing regeneration steps.【d88e71†L1-L6】【658344†L1-L3】
+  - Sync test executed as part of global suite.【ef51e5†L80-L115】
+- **Result:** ✅ **Compliant** – evidence regeneration and contract updates behave as specified.
+
+### Phase 3 – Orchestrator Integration (⚠️ Contamination Zone)
+- **Findings:**
+  - `src/server.ts` now imports workflow state helpers and extends `ProgressSnapshot` to carry `workflowMetadata`, persisting metadata caches inside the product runtime.【F:src/server.ts†L85-L177】【F:src/server.ts†L124-L138】
+  - Progress setters inject workflow metadata into SSE payloads for end users.【F:src/server.ts†L260-L317】
+  - A new `/api/workflow/status` endpoint exposes developer-only metadata via the product server.【F:src/server.ts†L2304-L2319】
+  - API test `tests/api/workflow-status.test.ts` asserts workflow metadata via HTTP, keeping this contamination entrenched.【F:tests/api/workflow-status.test.ts†L1-L200】
+- **Plan alignment:** Phase 3 plan proposed wiring workflow metadata into `src/server.ts`, but `WHAT_IS_WHAT.md` and `06_confusion_analysis.md` clarify that workflow systems must remain separate from product endpoints to avoid category confusion.【F:docs/04_141024_todays_status.md/02_post_audit_new_plan.md†L94-L154】【F:WHAT_IS_WHAT.md†L9-L112】【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L150-L186】
+- **Commands/tests:** `tests/state/phaseState.test.ts` cover shared library behavior.【ef51e5†L85-L115】 API workflow test ran (evidence of contamination).【ef51e5†L80-L115】
+- **Result:** ❌ **Non-compliant – Track contamination detected.**
+
+### Phase 4 – Autonomous Executor
+- **Implementation review:** `scripts/execute-next-action.js` enforces safety checks, supports interactive/dry/auto modes, and uses workflow metadata only in CLI context.【F:scripts/execute-next-action.js†L1-L200】 Test suite validates help text, dry-run output, and safeguards.【F:tests/state/execute-next-action.test.ts†L1-L130】 Commands are registered in `package.json`.【F:package.json†L31-L37】
+- **Commands verified:**
+  - `npm run state:next:dry` prints current state and command in dry-run mode.【391de0†L1-L16】
+  - `npm run state:next -- --help` shows usage and safety notes.【f1a0a0†L1-L5】【29df48†L1-L17】
+  - Execution tests ran within overall suite.【ef51e5†L80-L115】
+- **Result:** ✅ **Compliant** – CLI-only automation behaves as designed.
+
+## 3. Plan vs Implementation Comparison
+| Phase | Planned Outcome | Observed Implementation | Match | Notes |
+|-------|-----------------|-------------------------|-------|-------|
+| Phase 1 | Standalone snapshot CLI | Snapshot script + CLI outputs JSON and summary | ✅ | No runtime coupling.【F:scripts/snapshot-state.js†L1-L224】【10dfd6†L1-L53】 |
+| Phase 2 | Contract sync regenerates evidence | Sync script regenerates SBOM, provenance, test evidence | ✅ | CLI + tests confirm behavior.【F:scripts/sync-contract-status.js†L1-L200】【658344†L1-L3】 |
+| Phase 3 | (Planned) wire phase state into server | Server now embeds workflow metadata in product endpoints | ❌ | Violates track separation despite plan’s suggestion.【F:src/server.ts†L85-L317】【F:WHAT_IS_WHAT.md†L9-L112】 |
+| Phase 4 | Autonomous executor CLI | CLI enforces safety and executes suggested actions | ✅ | Limited to workflow tooling.【F:scripts/execute-next-action.js†L1-L200】 |
+
+## 4. Track Contamination Report
+- **Verdict:** Repository is **CONTAMINATED**.
+- **Instances:**
+  1. **Server import & type coupling (🔴 Critical):** Product server imports workflow module and widens `ProgressSnapshot` with workflow metadata, binding developer guidance to user-facing runtime.【F:src/server.ts†L85-L138】 Violates track separation spelled out in `WHAT_IS_WHAT.md` and the confusion analysis.【F:WHAT_IS_WHAT.md†L9-L112】【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L150-L186】
+  2. **Metadata caching & SSE payloads (🔴 Critical):** Workflow metadata cache persists per execution session and SSE responses leak workflow guidance to end users.【F:src/server.ts†L154-L317】
+  3. **Workflow REST endpoint (🔴 Critical):** `/api/workflow/status` lives alongside product APIs, exposing developer-only context through the public server.【F:src/server.ts†L2304-L2319】
+  4. **API test coverage (⚠️ High):** `tests/api/workflow-status.test.ts` institutionalizes the contamination by exercising workflow metadata over HTTP.【F:tests/api/workflow-status.test.ts†L1-L200】
+- **Recommended action:** Remove workflow imports and metadata from `src/server.ts`, delete/move `/api/workflow/status` to workflow tooling, and relocate associated tests outside `tests/api`. Detailed steps provided in the remediation plan.
+
+## 5. Evidence Bundle
+### Commands Executed
+- `npm test tests/state/snapshot.test.ts` (triggered full suite with coverage).【fd73d3†L1-L5】【52c23d†L67-L103】
+- `npm run state:show`.【10dfd6†L1-L53】
+- `npm run state:sync`.【d88e71†L1-L6】【658344†L1-L3】
+- `npm run state:next:dry`.【391de0†L1-L16】
+- `npm run state:next -- --help`.【f1a0a0†L1-L5】【29df48†L1-L17】
+- `npm run lint`.【a88f1e†L1-L5】
+- `npm run typecheck`.【492aec†L1-L5】
+- `npm run contract:check`.【fc223f†L1-L52】
+- `npm test` (full suite + coverage).【562d25†L1-L5】【ef51e5†L73-L103】
+
+### Key Source Citations
+- Snapshot script & tests.【F:scripts/snapshot-state.js†L1-L224】【F:tests/state/snapshot.test.ts†L1-L33】
+- Sync script & tests.【F:scripts/sync-contract-status.js†L1-L200】【F:tests/state/sync.test.ts†L1-L135】
+- Workflow state module & tests.【F:src/state/phaseState.ts†L1-L315】【F:tests/state/phaseState.test.ts†L1-L74】
+- Server contamination & API tests.【F:src/server.ts†L85-L317】【F:src/server.ts†L2304-L2319】【F:tests/api/workflow-status.test.ts†L1-L200】
+- Autonomous executor CLI & tests.【F:scripts/execute-next-action.js†L1-L200】【F:tests/state/execute-next-action.test.ts†L1-L130】
+- Track separation documentation.【F:WHAT_IS_WHAT.md†L9-L211】【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L150-L186】
+
+## 6. Remediation Overview
+- **Total issues:** 4 (see `WORKFLOW_PHASES_1-4_REMEDIATION_PLAN.md` for full details and priority matrix).
+- **Immediate focus:** Roll back Phase 3 wiring in `src/server.ts` and move workflow exposure back to CLI/scripts.
+
+---
+*Prepared by: Validator (Workflow Phases 1-4 audit)*
 
EOF
)