Claude’s Plan
REVISED: Autonomous Workflow Progression - Incremental, Schema-First Approach
Response to Evaluation Feedback
The evaluation correctly identified 5 critical gaps in my original plan:
Schema misalignment - contracts lack status fields
State machine duplication - existing runtime orchestrator already manages state
Circular dependencies - proposed state file needs data that contracts don't provide
Parallel truth sources - risk creating divergence instead of solving it
Documentation bloat - AGENTS.md already spans 200+ lines
Revised Strategy: Read-Only → Schema Evolution → Automation
PHASE 1: Read-Only State Synthesis (PILOT - 2 hours)
Goal: Prove value without schema changes or breaking changes
1.1 Create .automation/WHERE_AM_I.json (Read-Only Snapshot)
NOT a source of truth - just a synthesized view
Generated from existing authoritative sources:
GATES_LEDGER.md (gate status)
Progress JSON files (historical tasks)
Contract JSON (task definitions)
Git status (uncommitted work)
Regenerated on demand via npm run state:snapshot
No write-back to contracts (avoiding circular dependency)
Structure:
{
  "generated_at": "2025-10-14T04:15:00Z",
  "data_sources": {
    "gates": ".automation/GATES_LEDGER.md",
    "contract": "contracts/Roadmap_execution/19_*.json",
    "git": "git status --porcelain"
  },
  "current_phase": {
    "id": "19",
    "milestone": "T0",
    "contract_path": "contracts/.../19_phase19_autonomous_transition_contract.json"
  },
  "gates_summary": {
    "G0": "passed", "G1": "passed", "G2": "passed",
    "G3": "partial", "G4": "not_started"
  },
  "validation_summary": {
    "last_run": "2025-10-14T04:09:47Z",
    "lint": "pass", "typecheck": "pass",
    "test": "pass (345/345)", "contract_check": "pass"
  },
  "uncommitted_changes": [
    "tests/api/problem-details.test.ts",
    "tests/api/executions.test.ts"
  ],
  "suggested_next_action": {
    "action": "COMMIT_PENDING_TESTS",
    "reasoning": "G2 passed, tests validated, ready to commit",
    "command": "git add tests/api/*.test.ts && git commit"
  }
}
Benefits:
No schema changes needed (CODEOWNERS approval avoided)
No circular dependencies (read-only derivation)
Immediate value (developers see "where am I?" in one file)
Low risk (if wrong, just regenerate)
1.2 Create scripts/snapshot-state.js
Parses GATES_LEDGER.md for gate status
Reads Phase 19 contract JSON for task list
Runs validation commands, captures exit codes
Checks git status for uncommitted work
Applies decision heuristics (if G2 passed + tests pass + uncommitted → suggest commit)
Outputs WHERE_AM_I.json
Reuses existing code:
scripts/validate-contract.js patterns for JSON parsing
Existing validation command runners
1.3 Add npm Commands
{
  "scripts": {
    "state:snapshot": "node scripts/snapshot-state.js",
    "state:show": "npm run state:snapshot && cat .automation/WHERE_AM_I.json | jq"
  }
}
1.4 Update AGENTS.md (Minimal Addition)
Add single paragraph under "Current Work":
**Quick Status Check:**
```bash
npm run state:show  # See WHERE_AM_I.json (current phase, gates, validations, next action)
📍 .automation/WHERE_AM_I.json is auto-generated. To understand state sources, see CDI_INFRASTRUCTURE.md.

**No new protocol - just a utility reference.**

---

### PHASE 2: Schema Evolution (AFTER Phase 1 Proves Valuable - 3 hours)
**Goal:** Add authoritative status tracking to contracts

#### 2.1 Extend `contracts/schemas/roadmap_phase.schema.json`
**Requires CODEOWNERS approval** (protected file)

Add to task object schema:
```json
{
  "properties": {
    "tasks": {
      "items": {
        "properties": {
          "id": {"type": "string"},
          "title": {"type": "string"},
          // NEW FIELDS:
          "status": {
            "type": "string",
            "enum": ["pending", "in_progress", "complete", "blocked"]
          },
          "started_at": {"type": "string", "format": "date-time"},
          "completed_at": {"type": "string", "format": "date-time"},
          "validation_results": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "cmd": {"type": "string"},
                "exit_code": {"type": "integer"},
                "timestamp": {"type": "string"}
              }
            }
          }
        }
      }
    }
  }
}
Add to gates array schema:
{
  "properties": {
    "gates": {
      "items": {
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "status": {
            "type": "string",
            "enum": ["not_started", "in_progress", "passed", "failed", "blocked"]
          },
          // status already partially present in Phase 19 contract
        }
      }
    }
  }
}
2.2 Update Phase 19 Contract with Status Fields
npm run state:sync-contract 19  # Writes status based on evidence
Script logic:
For each task, check validation commands
If all validation passes → "complete"
If evidence files exist → "complete"
Otherwise → "pending"
2.3 Add Contract Status Validation
npm run contract:check  # Now also validates status consistency
Check:
If gate status="passed", all prerequisite task statuses must be "complete"
If task status="complete", validation_results must show exit_code=0
PHASE 3: Shared State Library (AFTER Schema Stabilizes - 2 hours)
Goal: Eliminate duplication between runtime orchestrator and CLI scripts
3.1 Create src/state/phaseState.ts
Shared TypeScript module for both runtime and CLI:
export interface PhaseState {
  phase: string;
  milestone: string;
  gates: Record<string, GateStatus>;
  current_task?: TaskInfo;
  next_task?: TaskInfo;
}

export function loadPhaseState(contractPath: string): PhaseState {
  // Parses contract JSON, reads gate ledger, synthesizes state
}

export function canAdvanceToNextTask(state: PhaseState): boolean {
  // Decision logic shared by orchestrator and CLI
}
3.2 Refactor Orchestrator to Use Shared State
src/server.ts imports phaseState module
Runtime orchestrator delegates "what's next?" to shared logic
CLI scripts use same module → no divergence
PHASE 4: Autonomous Decision Engine (AFTER Shared State - 1 hour)
Goal: Codify "what's next?" heuristics
4.1 Enhance WHERE_AM_I.json with Decision Tree
Now powered by shared phaseState module:
{
  "suggested_next_action": {
    "action": "EXECUTE_TASK",
    "task_id": "T0-FINAL",
    "autonomous": true,
    "prerequisites_met": true,
    "command": "npm run state:complete T0-GATE-1 && git add . && git commit"
  }
}
4.2 Add Autonomous Execution (Opt-In)
npm run state:next --auto  # Executes suggested action if autonomous=true
Incremental Rollout Timeline
Phase	Duration	Approval Needed	Risk	Value
Phase 1	2 hours	No (additive)	Low	Medium (immediate "where am I?")
Phase 2	3 hours	Yes (CODEOWNERS)	Medium	High (authoritative status)
Phase 3	2 hours	No	Low	High (eliminates duplication)
Phase 4	1 hour	No	Low	High (autonomous progression)
Addressing Evaluation Concerns
✅ Schema Alignment First
Phase 2 explicitly evolves schema before automation
CODEOWNERS approval process respected
✅ Shared State Library
Phase 3 creates src/state/phaseState.ts
Both orchestrator and CLI use same module
✅ Pilot with Read-Only
Phase 1 is pure synthesis, no write-back
Proves value before invasive changes
✅ Incremental Documentation
Phase 1 adds only 1 paragraph to AGENTS.md
Full documentation deferred until Phase 4
✅ Automation Hardening
Reuses validate-contract.js patterns
New tests added to tests/state/ directory
Coverage thresholds maintained
Files Created/Modified (Phase 1 Only)
New Files (Phase 1)
.automation/WHERE_AM_I.json (generated output, not committed)
scripts/snapshot-state.js (generator script)
Modified Files (Phase 1)
package.json (add state:snapshot, state:show commands)
AGENTS.md (add 1 paragraph referencing state:show)
.gitignore (ignore WHERE_AM_I.json - regenerated on demand)
Tests (Phase 1)
tests/state/snapshot.test.ts (validates JSON structure)
Phase 1 requires NO schema changes, NO CODEOWNERS approval.
Success Criteria (Phase 1)
✅ Developer runs npm run state:show ✅ Sees current phase, gate status, validation results in <2 seconds ✅ Gets actionable suggestion ("commit tests", "run validation", etc.) ✅ If suggestion wrong, regenerates without side effects ✅ All existing tests still pass (no breaking changes)
Next Steps
Option A: Implement Phase 1 Only (Pilot)
Low risk, immediate value
Proves concept before schema changes
Can abandon if not helpful
Option B: Full Phases 1-4 (Comprehensive)
Requires CODEOWNERS approval for Phase 2
8 total hours of work
Complete autonomous workflow
Recommendation: Start with Phase 1, gather feedback, decide on Phase 2+ Would you like me to implement Phase 1 (read-only WHERE_AM_I.json)?
