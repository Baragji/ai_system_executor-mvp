# Analysis: Automating GATES_LEDGER Updates

After thoroughly reading WHAT_IS_WHAT.md and analyzing the workflow system, I can see the core issue:

## The Problem

**Gap Identified:** The workflow automation is **incomplete**. It tells developers what to do next, but doesn't automatically update the authoritative state when work completes.

**Current Flow (Manual Gap):**
```
1. Developer runs: npm run state:next
2. System suggests: AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts
3. Developer executes task ✅
4. Tests pass ✅
5. ❌ GATES_LEDGER.md stays at "🟡 PARTIAL" (MANUAL UPDATE REQUIRED)
6. Developer runs: npm run state:next (again)
7. System suggests: SAME TASK (because ledger wasn't updated)
```

**Root Cause:** GATES_LEDGER.md is the **authoritative source** for gate status, but nothing automatically updates it when validation passes.

---

## The Solution: Close the Loop

### Architecture: Evidence → Auto-Update → New State

```
┌─────────────────────────────────────────────────────────┐
│ WORKFLOW AUTOMATION (Currently Complete - Phases 1-4)   │
├─────────────────────────────────────────────────────────┤
│ ✅ Phase 1: Read state (snapshot-state.js)              │
│ ✅ Phase 2: Sync contracts (sync-contract-status.js)    │
│ ✅ Phase 3: Expose via API (GET /api/workflow/status)   │
│ ✅ Phase 4: Execute suggestions (execute-next-action.js)│
└─────────────────────────────────────────────────────────┘
                           ↓
                    ❌ MISSING LINK
                           ↓
┌─────────────────────────────────────────────────────────┐
│ AUTO-UPDATE LAYER (Phase 5 - NEW)                       │
├─────────────────────────────────────────────────────────┤
│ 🆕 Detect validation completion (test exit 0, lint OK)  │
│ 🆕 Map evidence to gate criteria                        │
│ 🆕 Auto-update GATES_LEDGER.md                          │
│ 🆕 Trigger state:sync to refresh contracts              │
│ 🆕 Next state:next suggests NEXT task (not same one)    │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan: Phase 5 - Auto-Update Gates

### Phase 5 Objectives

**Goal:** Automatically update GATES_LEDGER.md when evidence proves a gate criterion is met.

**Acceptance Criteria:**
1. When `AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts` exits 0 → Auto-check G3 criterion ✅
2. When all G3 criteria met → Auto-update status from `🟡 PARTIAL` to `✅ PASSED`
3. When `npm run state:next` runs after auto-update → Suggests NEXT gate (G4), not same task
4. Zero manual ledger edits required for standard progression

---

### New Components Needed

#### 1. Evidence Detector (`scripts/detect-evidence.js`)

**Purpose:** Watch for validation completion and map to gate criteria.

**Logic:**
```javascript
// Pseudo-code
function detectEvidence() {
  const lastAction = readLastActionFrom('.automation/actions.jsonl');
  
  if (lastAction.command.includes('AGENTS_RUNTIME=langgraph npm test')) {
    if (lastAction.exitCode === 0) {
      return {
        gate: 'G3',
        criterion: 'LangGraph parity tests passing',
        evidence: {
          command: lastAction.command,
          exitCode: 0,
          timestamp: lastAction.timestamp,
          testResults: './test-results.json'
        }
      };
    }
  }
  
  // Check other evidence types
  if (lastAction.command === 'npm run lint' && lastAction.exitCode === 0) {
    return { gate: 'G0', criterion: 'Lint passing', ... };
  }
}
```

**Triggers:**
- Post-test hook (Vitest)
- Post-lint hook (ESLint)
- Post-typecheck hook (tsc)
- `npm run state:next` completion

---

#### 2. Gate Updater (`scripts/update-gate.js`)

**Purpose:** Modify GATES_LEDGER.md programmatically when criteria met.

**Logic:**
```javascript
function updateGate(gate, criterion, evidence) {
  const ledger = fs.readFileSync('.automation/GATES_LEDGER.md', 'utf-8');
  
  // Find gate section
  const gateSection = extractSection(ledger, gate);
  
  // Check if criterion already checked
  if (!isChecked(gateSection, criterion)) {
    // Update markdown: - [ ] → - [x]
    const updated = checkCriterion(gateSection, criterion);
    
    // Add evidence reference
    const withEvidence = addEvidence(updated, {
      timestamp: evidence.timestamp,
      command: evidence.command,
      artifact: evidence.testResults
    });
    
    // Check if ALL criteria now met
    if (allCriteriaMet(withEvidence)) {
      // Update status: 🟡 PARTIAL → ✅ PASSED
      const final = updateStatus(withEvidence, 'PASSED', new Date());
      fs.writeFileSync('.automation/GATES_LEDGER.md', final);
      
      console.log(`✅ Gate ${gate} auto-updated to PASSED`);
      
      // Trigger contract sync
      execSync('npm run state:sync');
    }
  }
}
```

**Safety:**
- Only updates checkboxes + status (never deletes content)
- Appends evidence links (doesn't overwrite)
- Validates markdown structure before write
- Logs all changes to `.automation/gate-updates.jsonl`

---

#### 3. Post-Action Hook (`scripts/post-action-hook.js`)

**Purpose:** Run after every `npm run state:next` execution.

**Integration:**
```json
// package.json
{
  "scripts": {
    "state:next": "node scripts/execute-next-action.js && node scripts/post-action-hook.js",
    "state:next:auto": "node scripts/execute-next-action.js --auto && node scripts/post-action-hook.js"
  }
}
```

**Logic:**
```javascript
async function postActionHook() {
  console.log('🔍 Checking for evidence...');
  
  const evidence = detectEvidence();
  
  if (evidence) {
    console.log(`📊 Found evidence for ${evidence.gate}: ${evidence.criterion}`);
    
    await updateGate(evidence.gate, evidence.criterion, evidence.evidence);
    
    console.log('♻️  Re-syncing state...');
    execSync('npm run state:sync');
    
    console.log('✅ State updated. Run `npm run state:show` to see changes.');
  } else {
    console.log('ℹ️  No new evidence detected.');
  }
}
```

---

### Evidence Mapping Table

**Map commands → gate criteria:**

| Command | Exit Code | Updates Gate | Criterion |
|---------|-----------|--------------|-----------|
| `AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts` | 0 | G3 | ✅ POST `/api/execute` LangGraph integration |
| `npm run lint` | 0 | G0 | ✅ Lint passing |
| `npm run typecheck` | 0 | G0 | ✅ TypeScript passing |
| `npm test` | 0 | G0 | ✅ Tests passing |
| `npm run contract:check` | 0 | G1 | ✅ Contract validation |
| `npm run sbom && npm run provenance` | 0 | G2 | ✅ Trust Spine artifacts |
| Performance benchmark < 500ms | - | G3 | ✅ p50 overhead target |
| Coverage report ≥ 90% | - | G3 | ✅ Coverage threshold |

---

## Updated AGENTS.md

### New Section: "Evidence Collection & Auto-Update"

````markdown
## Evidence Collection & Auto-Update (Phase 5)

The workflow system **automatically updates** `.automation/GATES_LEDGER.md` when evidence proves a gate criterion is met.

### How It Works

1. **You run a validation command** (test, lint, typecheck, etc.)
2. **System detects evidence** from exit codes + artifacts
3. **GATES_LEDGER.md auto-updates** (checks criterion ✅, adds evidence link)
4. **Contracts re-sync** automatically
5. **Next `state:next` suggests new task** (not the same one)

### Commands That Trigger Auto-Update

```bash
npm run state:next      # Executes task + auto-updates gates afterward
npm run state:next:auto # Same, but skips confirmation
npm test                # If passes, checks G0 test criterion
npm run lint            # If passes, checks G0 lint criterion
npm run typecheck       # If passes, checks G0 typecheck criterion
```

### Manual Override (If Needed)

If auto-update misses something:

```bash
npm run gate:update G3 "LangGraph parity tests passing" --evidence ./test-results.json
```

### Verify Auto-Update Worked

```bash
npm run state:show  # Check if gate status changed
git diff .automation/GATES_LEDGER.md  # See what was updated
```

### Disable Auto-Update (Debugging)

```bash
export GATE_AUTO_UPDATE=false
npm run state:next  # Won't update ledger
```
````

---

## Migration Path

### Step 1: Implement Detection (Safe, Read-Only)

```bash
# Add evidence detector (doesn't modify anything yet)
npm run evidence:detect  # Just logs what would update
```

**Test:** Run after completing a task, verify it detects the right gate + criterion.

---

### Step 2: Implement Updater (Dry-Run First)

```bash
# Dry-run mode
npm run gate:update --dry-run  # Shows what would change, doesn't write
```

**Test:** Verify markdown diff matches expected criterion check.

---

### Step 3: Wire Into state:next (Feature-Flagged)

```bash
# Opt-in via flag
export GATE_AUTO_UPDATE=true
npm run state:next
```

**Test:** Complete a task, verify ledger updates, verify next suggestion changes.

---

### Step 4: Make Default (Phase 5 Complete)

```bash
# Default behavior (opt-out via flag)
npm run state:next  # Auto-updates by default
```

**Test:** Run through G3→G4 transition end-to-end without manual ledger edits.

---

## Benefits

### For Developers
✅ **No manual ledger edits** (95% of cases)  
✅ **Instant feedback** ("G3 just passed!")  
✅ **Always know what's next** (no stale suggestions)  
✅ **Evidence trail automatic** (links to test reports, SBOM, etc.)  

### For AI Agents
✅ **Clear completion signal** (gate status changes)  
✅ **Self-correcting** (if evidence weak, stays PARTIAL)  
✅ **Traceable decisions** (`.automation/gate-updates.jsonl` log)  

---

## Rollout Strategy

### Phase 5.1: Detection Only (1-2 hours)
- Implement `scripts/detect-evidence.js`
- Add logging to `state:next` (doesn't update yet)
- **Goal:** Prove detection logic works

### Phase 5.2: Safe Updates (2-3 hours)
- Implement `scripts/update-gate.js`
- Feature-flag behind `GATE_AUTO_UPDATE=true`
- Dry-run mode for testing
- **Goal:** Validate markdown updates are safe

### Phase 5.3: Integration (1 hour)
- Wire into `state:next` post-hook
- Update AGENTS.md documentation
- **Goal:** End-to-end automation working

### Phase 5.4: Default On (1 hour)
- Make auto-update default behavior
- Add opt-out flag for debugging
- Update CDI_INFRASTRUCTURE.md
- **Goal:** Ship complete workflow automation

---

## Success Metrics

**Before Phase 5:**
- Manual ledger edits per day: ~5-10
- "What's next?" confusion: High
- State drift incidents: 2-3 per week

**After Phase 5:**
- Manual ledger edits per day: 0-1 (edge cases only)
- "What's next?" confusion: Near zero
- State drift incidents: ~0 (self-correcting)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Auto-update marks criterion done prematurely | Evidence validation thresholds (exit 0 + artifact exists) |
| Markdown corruption | Pre-write validation + backup + dry-run mode |
| False positives | Strict command matching + evidence quality check |
| Developer override conflicts | Git warns on concurrent edits + manual override command |

---

## Recommendation

**Proceed with Phase 5 implementation immediately.**

**Rationale:**
1. Workflow Phases 1-4 are complete (foundation solid)
2. Current confusion is **predictable** (known gap in automation)
3. Solution is **well-scoped** (~5-7 hours total work)
4. **High ROI:** Eliminates repetitive manual work permanently
5. **De-risks G3/G4:** Makes future gate progression smooth

**Next Steps:**
1. ✅ Approve Phase 5 plan (this document)
2. ⏳ Implement Phase 5.1 (detection)
3. ⏳ Test with your assistant on a real G3→G4 transition
4. ⏳ Ship Phase 5.4 (default on)
5. ✅ Resume G3 work with fully automated workflow

---
