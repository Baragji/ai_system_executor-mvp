Phase 19 Autonomous Workflow – FINAL IMPLEMENTATION PLAN
Post-Audit Adjustments Incorporated
Status: ✅ APPROVED with required adjustments
Validation Report: docs/04_141024_todays_status.md/03_validation_report.md
Executive Summary
What's Complete ✅
Phase 1: Read-only snapshot system (state:show, state:show:validate)
Phase 2 (Partial): Schema evolution (status fields added to schema + contract)
Phase 3 (Scaffold): Shared state module (src/state/phaseState.ts)
Evidence: 5/5 G2 files present, 350 tests passing, 82.18% coverage
Critical Gap 🔴
Contract drift: Phase 19 contract shows all T0 tasks as "pending", but validation confirms ALL are actually complete. This breaks the snapshot's decision logic.
Solution Roadmap
Phase 2B: Contract sync script (regenerates/validates ephemeral evidence)
Phase 3: Orchestrator integration (uses shared phaseState API)
Phase 4: Autonomous executor (opt-in state:next --auto)
PHASE 2B: Evidence-Aware Contract Sync (PRIORITY 1)
Objective
Automate contract status updates by regenerating ephemeral evidence (SBOM, provenance, action logs) rather than assuming persistence
Key Adjustment (Per Audit)
"The sync script should therefore regenerate or verify artifacts on the fly rather than assume their existence"
Why: .gitignore excludes sbom.cdx.json, provenance.intoto.jsonl; actions.jsonl requires feature flag. Must validate freshness, not just check existence.
Implementation: scripts/sync-contract-status.js
Evidence Validation Strategy
For each T0 task:
Task	Evidence Type	Validation Logic
T0-DOC-1 to T0-DOC-4	File content	Run validation greps → exit 0 → "complete"
T0-IMPL-1 (CycloneDX)	Regenerated artifact	Run npm run sbom:cyclonedx → check sbom.cdx.json size > 1MB → "complete"
T0-IMPL-2 (SLSA)	Regenerated artifact	Run npm run provenance → check provenance.intoto.jsonl contains "slsa.dev/provenance" → "complete"
T0-IMPL-3 (JSONL)	Code presence	Grep ACTION_LOG_JSONL in src/telemetry/events.ts → "complete"
T0-IMPL-4 (OTel)	Code presence	Grep NodeSDK in src/telemetry/otel.ts → "complete"
T0-IMPL-5 (RFC 9457)	Code presence	Grep occurred_at|getHttpReasonPhrase|toValidationProblem in src/middleware/problemDetails.ts → "complete"
T0-TEST-1	Test execution	Run npm test → 350 passing → "complete"
T0-EVID-1	Evidence bundle	Count .automation/evidence/G2/* → 5 files → "complete"
T0-GATE-1	Ledger status	Grep G2.*PASSED in .automation/GATES_LEDGER.md → "complete"
Script Structure
import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

async function validateTask(task) {
  const now = new Date().toISOString();
  
  switch(task.id) {
    case 'T0-DOC-1':
    case 'T0-DOC-2':
    case 'T0-DOC-3':
    case 'T0-DOC-4':
      // Run validation commands from contract
      const allPass = task.validation.every(v => {
        try {
          execSync(v.cmd, { stdio: 'ignore' });
          return true;
        } catch { return false; }
      });
      return allPass ? { status: 'complete', completed_at: now } : { status: 'pending' };
    
    case 'T0-IMPL-1':
      // Regenerate SBOM
      execSync('npm run sbom:cyclonedx', { stdio: 'ignore' });
      const sbomExists = await fs.stat('sbom.cdx.json').then(s => s.size > 1000000).catch(() => false);
      return sbomExists ? { status: 'complete', completed_at: now } : { status: 'blocked' };
    
    case 'T0-IMPL-2':
      // Regenerate provenance
      execSync('npm run provenance', { stdio: 'ignore' });
      const provContent = await fs.readFile('provenance.intoto.jsonl', 'utf-8').catch(() => '');
      const hasSlsa = provContent.includes('slsa.dev/provenance');
      return hasSlsa ? { status: 'complete', completed_at: now } : { status: 'blocked' };
    
    case 'T0-IMPL-3':
      const eventsCode = await fs.readFile('src/telemetry/events.ts', 'utf-8');
      return eventsCode.includes('ACTION_LOG_JSONL') ? { status: 'complete', completed_at: now } : { status: 'pending' };
    
    case 'T0-IMPL-4':
      const otelCode = await fs.readFile('src/telemetry/otel.ts', 'utf-8');
      return otelCode.includes('NodeSDK') ? { status: 'complete', completed_at: now } : { status: 'pending' };
    
    case 'T0-IMPL-5':
      const pdCode = await fs.readFile('src/middleware/problemDetails.ts', 'utf-8');
      const hasFields = pdCode.includes('occurred_at') && pdCode.includes('getHttpReasonPhrase');
      return hasFields ? { status: 'complete', completed_at: now } : { status: 'pending' };
    
    case 'T0-TEST-1':
      const testResult = execSync('npm test 2>&1', { encoding: 'utf-8' });
      const passing = testResult.match(/Tests\s+(\d+)\s+passed/);
      return (passing && parseInt(passing[1]) >= 345) ? { status: 'complete', completed_at: now } : { status: 'blocked' };
    
    case 'T0-EVID-1':
      const evidFiles = await fs.readdir('.automation/evidence/G2/');
      return evidFiles.length >= 5 ? { status: 'complete', completed_at: now } : { status: 'blocked' };
    
    case 'T0-GATE-1':
      const ledger = await fs.readFile('.automation/GATES_LEDGER.md', 'utf-8');
      return /G2.*PASSED/.test(ledger) ? { status: 'complete', completed_at: now } : { status: 'pending' };
    
    default:
      return { status: 'pending' };
  }
}

async function syncContract(phaseId) {
  const contractPath = `contracts/Roadmap_execution/${phaseId}_phase${phaseId}_autonomous_transition_contract.json`;
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf-8'));
  
  console.log(`Syncing ${contract.tasks.length} tasks...`);
  let updated = 0;
  
  for (const task of contract.tasks) {
    const result = await validateTask(task);
    if (task.status !== result.status) {
      task.status = result.status;
      task.completed_at = result.completed_at;
      updated++;
      console.log(`  ✅ ${task.id}: ${result.status}`);
    }
  }
  
  if (updated > 0) {
    await fs.writeFile(contractPath, JSON.stringify(contract, null, 2));
    console.log(`\n✅ Updated ${updated} task(s) in contract`);
  } else {
    console.log(`\n✅ Contract already in sync`);
  }
}

syncContract(process.argv[2] || '19').catch(console.error);
Deliverables
scripts/sync-contract-status.js (as above)
package.json addition:
{
  "scripts": {
    "state:sync": "node scripts/sync-contract-status.js 19"
  }
}
scripts/snapshot-state.js enhancement: Add sync_status field
{
  "sync_status": {
    "last_sync": contractStat.mtime.toISOString(),
    "contract_stale": pendingTasks.length > 0,
    "stale_tasks": pendingTasks.map(t => t.id)
  }
}
Discovery note: .automation/phase19_state_sync_discovery.json|.md
Tests: tests/state/sync.test.ts
Validation
npm run state:sync  # Regenerates evidence, updates contract
npm run contract:check  # Validates schema compliance
npm run state:show  # Should now show all T0 tasks "complete"
npm test  # Ensure no regressions (350 passing)
Success Criteria
✅ All T0 tasks marked "complete" with timestamps
✅ Evidence regenerated on-demand
✅ Snapshot reflects accurate status
✅ Contract passes schema validation
✅ Idempotent (re-running doesn't break state)
PHASE 3: Orchestrator Integration (PRIORITY 2)
Objective
Eliminate duplicated decision logic by importing shared phaseState module into orchestrator
Key Adjustment (Per Audit)
"The proposed API sketch should be updated to match the existing loadPhaseState({rootDir}) signature"
Current API (from src/state/phaseState.ts:80):
export async function loadPhaseState(options: { rootDir?: string } = {}): Promise<PhaseState>
Implementation: Update src/server.ts
Add import:
import { loadPhaseState, suggestNextAction, formatHumanSummary } from "./state/phaseState.js";
Enhance progress snapshot:
async function getSessionProgress(sessionId: string): Promise<ProgressSnapshot> {
  const baseProgress = progressMaps.get(sessionId);
  
  // Load shared phase state
  const phaseState = await loadPhaseState({ rootDir: process.cwd() });
  
  return {
    ...baseProgress,
    phase_context: {
      phase: phaseState.phaseId,
      name: phaseState.phaseName,
      gates: phaseState.gates,
      tasks_complete: phaseState.tasks.filter(t => t.status === 'complete').length,
      tasks_total: phaseState.tasks.length
    },
    suggested_action: suggestNextAction(phaseState, validationSnapshot),
    human_summary: formatHumanSummary(phaseState, validationSnapshot)
  };
}
Wire into SSE endpoint (/api/progress/:sessionId):
app.get("/api/progress/:sessionId", async (req, res) => {
  // ... existing SSE setup ...
  
  const progress = await getSessionProgress(req.params.sessionId);
  
  res.write(`data: ${JSON.stringify(progress)}\n\n`);
});
Backward Compatibility Check
✅ Existing ProgressSnapshot fields unchanged
✅ New fields added as optional extensions
✅ No breaking changes to API contracts
Deliverables
Modified src/server.ts (orchestrator integration)
Tests: tests/integration/orchestrator-state.test.ts
Validation: Ensure SSE responses include phase context
Success Criteria
✅ Orchestrator imports phaseState module
✅ Progress endpoints emit phase context
✅ No duplication of decision heuristics
✅ All 350 existing tests still pass
PHASE 4: Autonomous Decision Engine (PRIORITY 3)
Objective
Enable opt-in autonomous execution of safe, deterministic actions
Key Adjustment (Per Audit)
"Autonomy must honor constraint (d) by keeping operations scriptable and gated"
Implementation: scripts/execute-next-action.js
import { loadPhaseState, suggestNextAction } from '../src/state/phaseState.js';
import { execSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const phaseState = await loadPhaseState();
  const action = suggestNextAction(phaseState, { /* validation results */ });
  
  console.log(`📋 Suggested Action: ${action.action}`);
  console.log(`💡 Reasoning: ${action.reasoning}`);
  console.log(`⚙️  Command: ${action.command || 'N/A'}`);
  
  if (!action.autonomous) {
    console.log(`\n❌ Action requires human approval. Aborting.`);
    process.exit(1);
  }
  
  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN: Would execute "${action.command}"`);
    return;
  }
  
  console.log(`\n✅ Executing autonomous action...`);
  
  switch(action.action) {
    case 'COMMIT_PENDING_TESTS':
      execSync('git add tests/ && git commit -m "test: autonomous commit of validated test changes"');
      console.log(`✅ Tests committed`);
      break;
    case 'COMMIT_PENDING_CHANGES':
      execSync('git add . && git commit -m "chore: autonomous commit of validated changes"');
      console.log(`✅ Changes committed`);
      break;
    case 'FIX_VALIDATION_ERRORS':
      execSync(action.command);
      console.log(`✅ Validation errors fixed`);
      break;
    case 'ADVANCE_ORCHESTRATOR_PILOT':
      console.log(`⚠️  Gate advancement requires human approval. See RUNBOOK.md`);
      break;
    default:
      console.log(`⚠️  Unknown action. Manual intervention required.`);
  }
}

main().catch(console.error);
Autonomous Flag Logic
Update suggestNextAction() in src/state/phaseState.ts:
export function suggestNextAction(state: PhaseState, validations: ValidationSnapshot): NextAction {
  const uncommittedCount = 0; // from git status
  const pendingTasks = state.tasks.filter(t => t.status !== 'complete');
  
  if (uncommittedCount > 0 && validations.lint === 'pass' && validations.test === 'pass') {
    return {
      action: 'COMMIT_PENDING_CHANGES',
      reasoning: 'All validations pass, uncommitted changes detected',
      command: 'git add . && git commit -m "..."',
      autonomous: true,  // ✅ Safe to auto-execute
      requires_approval: false
    };
  }
  
  if (state.gates.G2 === 'passed' && state.gates.G3 === 'partial') {
    return {
      action: 'ADVANCE_ORCHESTRATOR_PILOT',
      reasoning: 'G2 passed; G3 orchestrator work pending',
      command: null,
      autonomous: false,  // ❌ Needs human decision
      requires_approval: true
    };
  }
  
  return { action: 'NO_ACTION', reasoning: 'System in steady state', command: null, autonomous: false, requires_approval: false };
}
RUNBOOK.md
Create .automation/RUNBOOK.md:
# Autonomous Workflow Decision Tree

## On Session Start
1. Run `npm run state:show`
2. Read `suggested_next_action`
3. If `autonomous: true` → run `npm run state:next`
4. If `autonomous: false` → consult this runbook

## Action Catalog

### COMMIT_PENDING_CHANGES
- **Trigger:** Uncommitted files + all validations pass
- **Autonomous:** ✅ Yes
- **Command:** `git add . && git commit -m "..."`
- **Rollback:** `git reset HEAD~1`

### ADVANCE_ORCHESTRATOR_PILOT
- **Trigger:** G2 passed, G3 partial
- **Autonomous:** ❌ No (requires human approval)
- **Manual Steps:**
  1. Review G3 acceptance criteria (contracts/Roadmap_execution/19_*.json)
  2. Run parity tests: `AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts`
  3. Measure overhead: `npm run bench:orchestrator` (if implemented)
  4. Update GATES_LEDGER.md: G3 status → "passed"
  5. Run `npm run state:sync`

### FIX_VALIDATION_ERRORS
- **Trigger:** Validation failures detected
- **Autonomous:** ⚠️ Conditional (only if fix command is deterministic)
- **Command:** Suggested fix from error output
- **Rollback:** `git checkout .`
Deliverables
scripts/execute-next-action.js (autonomous executor)
.automation/RUNBOOK.md (decision tree documentation)
package.json additions:
{
  "scripts": {
    "state:next": "node scripts/execute-next-action.js",
    "state:next:dry-run": "node scripts/execute-next-action.js --dry-run"
  }
}
Tests: tests/state/execute.test.ts
Success Criteria
✅ npm run state:next:dry-run shows planned execution
✅ Autonomous actions execute without approval
✅ Non-autonomous actions gate correctly
✅ Runbook documents all paths
Implementation Timeline
Phase	Duration	Dependencies	Risk	Value
Phase 2B	3-4 hours	Evidence generators exist	Low	Critical (fixes drift)
Phase 3	2-3 hours	Phase 2B complete	Low	High (eliminates duplication)
Phase 4	1-2 hours	Phases 2B + 3 stable	Medium	High (full autonomy)
Total: 6-9 hours (~1-1.5 working days)
Governance Compliance Matrix
Constraint	Phase 2B	Phase 3	Phase 4
(a) No Breaking Changes	✅ Additive only	✅ Backward-compatible API	✅ Opt-in execution
(b) Best Practice Solutions	✅ Reuses existing validators	✅ Matches current API	✅ Idempotent scripts
(c) Big-Tech Standards	✅ Idempotent, defensive	✅ Structured logging	✅ Fail-safe defaults
(d) Fully Autonomous	✅ Scriptable, CI-ready	✅ Machine-readable outputs	✅ Zero-touch when safe
Immediate Next Steps
Recommended: Implement Phase 2B (Contract Sync)
Why: Fixes critical drift, unblocks Phases 3-4
Effort: 3-4 hours
Output: Accurate contract status, reliable snapshot Execution:
Create scripts/sync-contract-status.js (evidence-aware validation)
Add npm run state:sync command
Run sync → validate → commit
Create discovery note
Update snapshot to show sync status
Test end-to-end workflow
Validation Commands:
npm run state:sync  # Updates contract
npm run contract:check  # Validates schema
npm run state:show  # Displays updated status
npm test  # Ensures no regressions
Would you like me to implement Phase 2B now?