Autonomous Workflow Completion Plan - Gap Analysis & Roadmap
Current State Assessment (Based on Chat Log + Live Validation)
✅ Completed (Phases 1-2 Partial)
Phase 1: Read-Only Snapshot
✅ scripts/snapshot-state.js (working, generates WHERE_AM_I.json)
✅ npm run state:show and state:show:validate commands
✅ .automation/WHERE_AM_I.json added to .gitignore
✅ AGENTS.md updated with "Quick Status Check" section
✅ Discovery notes created (phase19_state_snapshot_discovery.json/.md)
✅ Test added (tests/state/snapshot.test.ts)
✅ Human-readable summary added to snapshot
✅ ALL TESTS PASSING (350 tests, 82.18% coverage)
Phase 2: Schema Evolution (Partial)
✅ Schema updated with status/started_at/completed_at/validation_results fields
✅ Contract supports numeric phase IDs (19, 20)
✅ Gates schema includes status enum
✅ Phase 19 contract seeded with "status": "pending" on all T0 tasks
✅ Contract validation passes
Phase 3: Shared State Library (Scaffold Only)
✅ src/state/phaseState.ts created with types and helpers
✅ Tests added (tests/state/phaseState.test.ts)
⚠️ NOT INTEGRATED - orchestrator doesn't use it yet
❌ Gaps / Incomplete Work
Critical Gap #1: Task Status Out of Sync
Problem: All T0 tasks show "status": "pending" in contract, but we verified ALL are actually complete:
T0-DOC-1 through T0-DOC-4: ✅ Files exist, validation passes
T0-IMPL-1 through T0-IMPL-5: ✅ Implemented, evidence present
T0-TEST-1: ✅ Tests passing (350 tests)
T0-EVID-1: ✅ Evidence bundle exists (5/5 files)
T0-GATE-1: ✅ GATES_LEDGER shows G2 PASSED
Impact: Snapshot suggests wrong next action because it reads stale contract data Fix Needed: Sync script to update contract task statuses based on actual evidence
Critical Gap #2: No Sync Script
Problem: No scripts/sync-contract-status.js to reconcile reality → contract Impact: Manual drift between contract JSON and actual completion state Fix Needed: Automated sync that:
Runs task validation commands
Checks evidence file existence
Updates contract JSON task status/completed_at fields
Validates gate prerequisites
Gap #3: Orchestrator Not Using Shared State
Problem: src/server.ts and orchestrator still use in-memory state, don't leverage phaseState.ts Impact: Duplication of decision logic, risk of divergence Fix Needed: Refactor orchestrator to import and use shared module
Gap #4: No Autonomous Execution (Phase 4)
Problem: state:next --auto doesn't exist, no deterministic action execution Impact: Still requires human to manually run suggested commands Fix Needed: Opt-in autonomous executor
Completion Plan: Phases 2B-4
PHASE 2B: Contract Status Sync (2-3 hours) ⚠️ HIGHEST PRIORITY
Objective
Create automated sync to update Phase 19 contract task statuses based on actual evidence
Deliverables
1. Create scripts/sync-contract-status.js Logic:
for each task in contract.tasks:
  if task.validation commands exist:
    run each validation command
    if ALL exit 0 → mark "complete", set completed_at
    else → mark "in_progress" or "blocked"
  
  if task has evidence_file requirement:
    check file exists
    if exists → mark "complete"
  
  if task type == "evidence":
    check .automation/evidence/G2/<expected files>
    if all present → mark "complete"
Evidence-Based Detection:
T0-DOC-1: Run validation greps → ALL pass → "complete"
T0-IMPL-1: Check scripts/generate-cyclonedx.js + sbom.cdx.json → "complete"
T0-IMPL-2: Check scripts/generate-provenance.js + provenance.intoto.jsonl → "complete"
T0-IMPL-3: Grep ACTION_LOG_JSONL in src/telemetry/events.ts → "complete"
T0-IMPL-4: Grep NodeSDK in src/telemetry/otel.ts → "complete"
T0-IMPL-5: Grep occurred_at|getHttpReasonPhrase|toValidationProblem in src/middleware/problemDetails.ts → "complete"
T0-TEST-1: Run npm test → 350 passing → "complete"
T0-EVID-1: Count files in .automation/evidence/G2/ → 5 files → "complete"
T0-GATE-1: Grep G2.*PASSED in .automation/GATES_LEDGER.md → "complete"
2. Add npm command
{
  "scripts": {
    "state:sync": "node scripts/sync-contract-status.js 19"
  }
}
3. Update snapshot to show sync status Add field:
{
  "sync_status": {
    "last_sync": "2025-10-14T10:00:00Z",
    "contract_stale": false,
    "stale_tasks": []
  }
}
4. Test sync script
npm run state:sync  # Updates Phase 19 contract
npm run contract:check  # Validates schema compliance
npm run state:show  # Should now show all tasks "complete"
5. Discovery Note .automation/phase19_state_sync_discovery.json|.md
Success Criteria
✅ Run npm run state:sync ✅ Phase 19 contract tasks updated to "status": "complete" ✅ completed_at timestamps populated ✅ npm run state:show reflects accurate status ✅ All validation gates pass
PHASE 3: Orchestrator Integration (2-3 hours)
Objective
Replace duplicated decision logic in orchestrator with shared phaseState module
Deliverables
1. Refactor src/server.ts Progress Tracking Current (in-memory only):
const progressMaps = new Map<string, ProgressSnapshot>();
Enhanced (uses shared state):
import { loadPhaseState, suggestNextAction } from "./state/phaseState.js";

function getSessionProgress(sessionId: string) {
  const phaseState = loadPhaseState("19");  // from shared module
  return {
    ...progressMaps.get(sessionId),
    phase_context: phaseState,
    suggested_action: suggestNextAction(phaseState, validations)
  };
}
2. Wire into /api/progress/:sessionId Endpoint Add phase context to SSE progress stream:
res.write(`data: ${JSON.stringify({
  ...progress,
  phase_state: phaseState,
  autonomous_suggestion: suggestNextAction(phaseState, validations)
})}\n\n`);
3. Test Integration
npm run dev
curl http://localhost:3000/api/progress/test-session-123
# Should include phase_state and autonomous_suggestion
Success Criteria
✅ Orchestrator imports phaseState module ✅ Progress endpoints include phase context ✅ No duplication of decision heuristics ✅ All existing tests still pass
PHASE 4: Autonomous Decision Engine (1-2 hours)
Objective
Enable opt-in autonomous execution of deterministic actions
Deliverables
1. Create scripts/execute-next-action.js Logic:
const snapshot = loadSnapshot();
const nextAction = snapshot.suggested_next_action;

if (!nextAction.autonomous) {
  console.error("Action requires human approval");
  process.exit(1);
}

switch (nextAction.action) {
  case "COMMIT_PENDING_TESTS":
    exec("git add tests/ && git commit -m '...'");
    break;
  case "FIX_VALIDATION_ERRORS":
    exec(nextAction.command);  // Run suggested fix
    break;
  case "ADVANCE_ORCHESTRATOR_PILOT":
    console.log("Human approval required for gate advancement");
    process.exit(0);
    break;
}
2. Add Autonomous Flag to Suggestions Update suggestNextAction() in phaseState.ts:
{
  action: "COMMIT_PENDING_TESTS",
  reasoning: "...",
  command: "git add tests/ && git commit",
  autonomous: true,  // Safe to auto-execute
  requires_approval: false
}

{
  action: "ADVANCE_ORCHESTRATOR_PILOT",
  reasoning: "...",
  command: null,
  autonomous: false,  // Needs human decision
  requires_approval: true
}
3. Add npm Command
{
  "scripts": {
    "state:next": "node scripts/execute-next-action.js",
    "state:next:dry-run": "node scripts/execute-next-action.js --dry-run"
  }
}
4. Update Runbook Create .automation/RUNBOOK.md with decision tree (from original plan)
Success Criteria
✅ npm run state:next --dry-run shows what would execute ✅ Autonomous actions execute without human intervention ✅ Non-autonomous actions require explicit approval ✅ Runbook documents all decision paths
Implementation Sequence
Week 1: Critical Sync (Phase 2B)
Days 1-2:
Implement sync-contract-status.js
Test on Phase 19 T0 tasks
Validate all tasks marked "complete"
Update snapshot to show sync status
Validation:
npm run state:sync
npm run state:show
# Should show all T0 tasks complete, G2 passed
Week 2: Integration (Phase 3)
Days 3-4: 5. Refactor orchestrator to use phaseState module 6. Wire into progress endpoints 7. Add tests for orchestrator integration 8. Validate no duplication Validation:
npm test
curl http://localhost:3000/api/progress/test | jq '.phase_state'
Week 3: Autonomy (Phase 4)
Days 5-6: 9. Implement execute-next-action.js 10. Add autonomous flags to suggestions 11. Create RUNBOOK.md 12. Test dry-run and live execution Validation:
npm run state:next:dry-run
npm run state:next  # Auto-commits if safe
Files to Create/Modify
New Files (Phase 2B-4)
scripts/sync-contract-status.js (contract status reconciliation)
scripts/execute-next-action.js (autonomous executor)
.automation/RUNBOOK.md (decision tree documentation)
.automation/phase19_state_sync_discovery.json|.md (Phase 2B discovery)
tests/state/sync.test.ts (sync script tests)
tests/state/execute.test.ts (autonomous execution tests)
Modified Files
src/server.ts (orchestrator integration)
src/state/phaseState.ts (add autonomous flags)
package.json (add state:sync, state:next commands)
scripts/snapshot-state.js (add sync_status field)
CDI_INFRASTRUCTURE.md (add RUNBOOK reference)
.automation/GATES_LEDGER.md (optional: reference state system)
Contract Update (One-Time)
contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json
Update all T0 task statuses to "complete"
Add completed_at timestamps
Update G2 gate status to "passed" (if not already)
Risk Mitigation
Risk: Breaking Existing Workflows
Mitigation: All changes additive, feature-flagged, backward-compatible
Risk: Contract Drift After Sync
Mitigation: Add CI check that runs state:sync --check to detect staleness
Risk: Autonomous Action Errors
Mitigation: Dry-run mode, explicit opt-in, rollback instructions in RUNBOOK
Risk: Schema Evolution Breaks Legacy
Mitigation: Status fields optional, backward-compatible, skipped if missing
Success Metrics
Developer Experience
✅ Developer runs npm run state:show → sees accurate "where am I?" ✅ Developer runs npm run state:next → autonomous commit if safe ✅ Zero manual "what's next?" questions per session
AI Agent Autonomy
✅ Agent reads snapshot → knows exact next task ✅ Agent executes deterministic actions without approval ✅ Agent syncs contract → always accurate status
Governance Quality
✅ Contract always reflects reality (via sync) ✅ GATES_LEDGER ↔ Contract ↔ Snapshot all aligned ✅ Audit trail: every decision documented
Immediate Next Steps (This Session)
Option A: Complete Phase 2B (Sync Script) - RECOMMENDED
Why: Highest immediate value - fixes critical status drift Effort: 2-3 hours Impact: Snapshot becomes reliable source of truth Steps:
Create scripts/sync-contract-status.js
Run sync on Phase 19 contract
Validate all T0 tasks marked "complete"
Update snapshot logic
Test end-to-end workflow
Option B: Full Phases 2B-4
Why: Complete the autonomous workflow vision Effort: 5-8 hours total Impact: Full autonomous progression system Steps:
Phase 2B: Sync script (2-3 hours)
Phase 3: Orchestrator integration (2-3 hours)
Phase 4: Autonomous executor (1-2 hours)
Option C: Assessment Only
Why: Need stakeholder input before proceeding Effort: 0 hours (this plan) Impact: Clear roadmap for future work
Recommendation
Start with Phase 2B (Sync Script) to fix the critical gap where contract status is stale. This:
✅ Solves immediate "what's next?" confusion
✅ Makes snapshot reliable
✅ Low risk (read evidence → write contract)
✅ Unblocks Phases 3-4
Then decide on Phases 3-4 based on how well Phase 2B works. Would you like me to implement Phase 2B (sync script) now?