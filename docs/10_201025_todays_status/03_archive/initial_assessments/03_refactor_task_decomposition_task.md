# MICROSERVICE REFACTOR: COMPLETE TASK DECOMPOSITION

## CONTEXT

You've recommended refactoring to microservices NOW. Approved.

**Critical Constraint**: The developers executing this refactor are AI assistants with:
- 30-45 minute maximum session time
- No context from previous sessions
- Must validate assumptions before executing

**Your Recommendation Summary**:
- Refactor Phase 1: Extract orchestrator-service, llm-gateway-service, runner-service
- Timeline: 1-2 weeks
- Then complete Phase 21 in new orchestrator-service

**Problem**: You provided ONLY analysis and recommendation. No execution plan exists.

---

## REQUIREMENTS

### Requirement 1: Refactor Status Tracking File

**Deliverable**: `docs/09_191025_todays_status/REFACTOR_STATUS_CHECKLIST.md`

**Must Include**:
- All refactoring work broken down by service
- Current status for each item (TODO/IN PROGRESS/DONE)
- Expected outcome per item
- Exact validation commands
- Dependencies between items

**Structure**:
```markdown
# Microservice Refactor Status

## Phase 1: Service Extraction (Week 1-2)

### Infrastructure Setup
- [ ] Task: Setup service templates
- **Expected Outcome**: [concrete, measurable]
- **Validation**: `[exact commands]`

### llm-gateway-service Extraction
- [ ] Task: Extract LLM provider logic
- **Expected Outcome**: [concrete, measurable]
- **Validation**: `[exact commands]`

[etc.]
```

---

### Requirement 2: Decompose into 30-45 Minute Tasks

**Output Location**: `docs/09_191025_todays_status/refactor_tasks/`

**File Naming**: `refactor_task_[NN]_[service]_[action].md`

Examples:
- `refactor_task_01_setup_service_template.md`
- `refactor_task_02_extract_llm_gateway.md`
- `refactor_task_03_setup_otel_tracing.md`

---

### Requirement 3: MANDATORY Task File Structure

Each task file MUST include these sections:

#### Section 1: Header
```markdown
# Refactor Task [NN]: [Short Description]

**Task ID**: REFACTOR-TASK-[NN]
**Estimated Time**: 30-45 minutes
**Prerequisites**: [List task IDs or "None"]
**Service**: [service-name]
**Refactor Phase**: Phase 1 / Phase 2 / Phase 3
**Impact Level**: Low / Medium / High / Critical
```

#### Section 2: Pre-Execution Validation (CRITICAL)
```markdown
## PRE-EXECUTION VALIDATION

**STOP: Before writing ANY code, you MUST validate these assumptions.**

### Validation Step 1: Verify Current State
**Command**:
```bash
[exact command to run]
```

**Expected Output**:
```
[what you should see]
```

**If output differs**: [what to do - stop/investigate/proceed with caution]

### Validation Step 2: Check Dependencies
**Command**:
```bash
[exact command to run]
```

**Expected Output**:
```
[what you should see]
```

**If missing**: [what to do]

### Validation Step 3: Confirm No Conflicts
**Command**:
```bash
[exact command to run]
```

**Expected Output**:
```
[what you should see]
```

**If conflicts exist**: [what to do]

### Validation Step 4: Verify Prerequisites Complete
**Command**:
```bash
[check if prerequisite tasks are done]
```

**Expected Output**:
```
[what you should see]
```

**If prerequisites incomplete**: STOP. Complete [task IDs] first.

---

**CHECKPOINT**: All validations passed? [ ] YES → Proceed [ ] NO → STOP and investigate

---
```

#### Section 3: Context
```markdown
## Context

### Problem Statement
[Why this task exists - what problem does it solve?]

### Current Monolith State
[What exists now in the monolith? Specific files and line numbers]

Evidence from analysis:
- File: `[path]:[line-range]` - [LOC count] lines - [description]
- Imports: `[count]` cross-module dependencies
- Tests: `[count]` test files covering this logic

### Desired Service State
[What should exist after extraction? Specific structure]

Target service structure:
```
service-name/
├── src/
│   ├── server.ts
│   ├── routes/
│   └── domain/
├── tests/
└── package.json
```

### Dependencies to Extract
[List all files and their dependencies that must move]
- `src/[module]/[file].ts` → `services/[service]/src/[file].ts`
- Dependencies: [list imports]
- Tests: [list test files]
```

#### Section 4: Evidence-Based Claims
```markdown
## Evidence-Based Analysis

**Claim**: This extraction will reduce context size by [X]%

**Evidence**:
- Current module LOC: [number] (from analysis)
- Service target LOC: [number]
- Reduction: [calculation]

**Claim**: This service has [N] clear boundaries

**Evidence**:
- Entry points: [list API endpoints]
- Dependencies: [list external calls]
- Exports: [list what other services need]

**Claim**: Tests can run independently

**Evidence**:
- Test file count: [number]
- Current test runtime: [time]
- Projected service test runtime: [time]
- Test dependencies: [list mocks needed]
```

#### Section 5: Step-by-Step Implementation
```markdown
## Implementation Steps

### Step 1: Create Service Scaffold
**Action**: [specific action]

**Commands**:
```bash
[exact commands]
```

**Files Created**:
- `services/[service]/package.json`
- `services/[service]/tsconfig.json`
- `services/[service]/src/server.ts`

**Validation After Step 1**:
```bash
[command to verify step worked]
```

**Expected Output**:
```
[what you should see]
```

### Step 2: Extract Domain Logic
**Action**: [specific action]

**Files to Move**:
- FROM: `src/[module]/[file].ts`
- TO: `services/[service]/src/domain/[file].ts`

**Commands**:
```bash
[exact commands]
```

**Update Imports**:
- Change: `import { X } from '../[module]'`
- To: `import { X } from './domain/[file]'`

**Validation After Step 2**:
```bash
[command to verify step worked]
```

**Expected Output**:
```
[what you should see]
```

[Continue for all steps...]

### Final Step: Integration Test
**Action**: Verify service works end-to-end

**Commands**:
```bash
# Start service
cd services/[service]
npm start &
sleep 2

# Test endpoint
curl -X POST http://localhost:[port]/[endpoint] \
  -H "Content-Type: application/json" \
  -d '[test payload]'
```

**Expected Output**:
```json
[expected response]
```
```

#### Section 6: Post-Execution Validation
```markdown
## POST-EXECUTION VALIDATION

**After completing all steps, you MUST validate these outcomes.**

### Validation 1: Service Runs Independently
```bash
cd services/[service]
npm test
npm start
```

**Expected**: All tests pass, service starts without errors

### Validation 2: Original Monolith Still Works
```bash
cd [monolith-root]
npm test
npm start
```

**Expected**: All tests pass, monolith starts (may need updates for extracted code)

### Validation 3: API Contract Maintained
```bash
# Test original endpoint still works
curl [original-endpoint]
```

**Expected**: [same response as before extraction]

### Validation 4: No Regressions
```bash
npm run lint
npm run typecheck
npm test
```

**Expected**: Zero errors, zero warnings, all tests pass

### Validation 5: Evidence Captured
```bash
echo '{"task":"REFACTOR-TASK-[NN]","status":"complete","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","service":"[service]","tests_passed":[count],"loc_extracted":[number]}' >> .automation/refactor_evidence.jsonl
```

**Expected**: Evidence logged

---

**CHECKPOINT**: All post-validations passed? [ ] YES → Mark task DONE [ ] NO → Roll back and investigate

---
```

#### Section 7: Rollback Procedure
```markdown
## Rollback Procedure

If this task fails or causes issues:

### Step 1: Revert Service Changes
```bash
cd services/[service]
git checkout HEAD -- .
```

### Step 2: Revert Monolith Changes
```bash
cd [monolith-root]
git checkout HEAD -- [files modified]
```

### Step 3: Verify Monolith Works
```bash
npm test
npm start
```

### Step 4: Document Failure
```bash
echo '{"task":"REFACTOR-TASK-[NN]","status":"rolled_back","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","reason":"[describe issue]"}' >> .automation/refactor_failures.jsonl
```
```

#### Section 8: Success Criteria
```markdown
## Definition of Done

Pre-execution validations:
- [ ] Current state verified
- [ ] Dependencies checked
- [ ] No conflicts detected
- [ ] Prerequisites complete

Implementation:
- [ ] Service scaffold created
- [ ] Domain logic extracted
- [ ] Tests moved and passing
- [ ] API endpoints functional

Post-execution validations:
- [ ] Service runs independently
- [ ] Monolith still works
- [ ] API contract maintained
- [ ] No regressions (lint/typecheck/tests)
- [ ] Evidence captured

Documentation:
- [ ] REFACTOR_STATUS_CHECKLIST.md updated
- [ ] Service README.md created
- [ ] Migration notes documented

---

**Time Check**: If approaching 45 minutes, STOP and document progress. Break remaining work into new task.
```

---

## TASK SCOPE FROM YOUR ANALYSIS

Based on your recommendation, decompose these areas:

### Phase 1: Core Service Extraction (Week 1-2)

**Infrastructure Tasks** (~4 tasks):
1. Setup service template with Express + OTel + RFC 9457
2. Setup inter-service HTTP client with correlation IDs
3. Setup per-service CI/CD pipeline
4. Setup service discovery/registry (if needed)

**llm-gateway-service Tasks** (~6 tasks):
5. Extract LLM provider interfaces (src/llm/index.ts)
6. Extract OpenAI provider (src/llm/providers/openai.ts)
7. Extract retry logic and telemetry
8. Setup service API endpoints
9. Wire monolith to call llm-gateway-service
10. Migrate tests and validate

**runner-service Tasks** (~5 tasks):
11. Extract sandbox execution logic (src/runner/)
12. Extract dependency installation
13. Extract test runner logic
14. Setup service API endpoints
15. Wire monolith and migrate tests

**orchestrator-service Tasks** (~8 tasks):
16. Extract StepQueue (src/orchestrator/stepQueue.ts)
17. Extract LangGraph integration (src/orchestrator/graph.ts)
18. Extract checkpoints and state management
19. Extract interrupt/pause/resume logic
20. Setup service API endpoints
21. Wire UI to orchestrator-service
22. Migrate all orchestration tests
23. Validate end-to-end flow

### Phase 2: Domain Services (Week 3-4)
24-35. planning-service, repair-service, executor-service extraction

### Phase 3: Supporting Services (Week 5)
36-42. clarification-service, telemetry-service, ui-service

---

## EVIDENCE REQUIREMENTS

Every task MUST include:

### Pre-Execution Evidence
- Current LOC in files to be extracted
- Number of cross-module imports
- Test count and runtime
- Dependency list

### Implementation Evidence
- Files created (list with LOC)
- Files modified (list with diff stats)
- Files deleted (list)

### Post-Execution Evidence
- Service LOC (total)
- Service test count and runtime
- Service API endpoints (list)
- Regression test results

### Record Format
```json
{
  "task_id": "REFACTOR-TASK-NN",
  "service": "service-name",
  "status": "complete",
  "timestamp": "ISO-8601",
  "pre_validation": {
    "current_loc": 1234,
    "current_imports": 45,
    "current_tests": 12
  },
  "post_validation": {
    "service_loc": 567,
    "service_imports": 8,
    "service_tests": 12,
    "tests_passed": true,
    "monolith_still_works": true
  }
}
```

---

## CONSTRAINTS

❌ **NEVER**:
- Create tasks longer than 45 minutes
- Skip pre-execution validation sections
- Skip post-execution validation sections
- Make claims without evidence from your analysis
- Assume files exist without validation commands
- Skip rollback procedures
- Omit specific file:line references

✅ **ALWAYS**:
- Include pre-execution validation with exact commands
- Include post-execution validation with exact commands
- Base all claims on your analysis metrics (the 12,617 LOC, 75 files, etc.)
- Provide exact file paths and line ranges
- Include rollback procedure
- Specify expected outputs for every command
- Include time estimates per step
- Provide "STOP" points if validations fail

---

## REFERENCE YOUR ANALYSIS

Use these metrics from your analysis in task evidence sections:

**From Current Repository Metrics**:
- Total LOC: 12,617
- Number of .ts files: 75
- Largest file: src/server.ts (2,404 lines)
- Cross-module imports: 66
- Test count: 98
- Test runtime: 10.53s

**From Technical Debt Projection**:
- Current TDI: 1,928
- Target service TDI: ~75 per service
- Target largest file per service: <500 LOC

**From Task Distribution**:
- 12 Phase 21 tasks touch orchestrator
- 1 task touches llm-gateway
- 2 tasks touch telemetry

Use these numbers to calculate evidence for each task (e.g., "extracting OpenAI provider removes ~200 LOC from monolith")

---

## DELIVERABLES CHECKLIST

- [ ] `REFACTOR_STATUS_CHECKLIST.md` created with all refactor work
- [ ] ~42 task files created in `refactor_tasks/` folder
- [ ] Each task has PRE-EXECUTION validation section
- [ ] Each task has POST-EXECUTION validation section
- [ ] Each task has rollback procedure
- [ ] Each task includes evidence from your analysis
- [ ] Each task is 30-45 minutes maximum
- [ ] Each task has specific file:line references
- [ ] Each task has exact validation commands
- [ ] All tasks follow the mandatory structure
- [ ] Task dependencies clearly marked

---

## Task Index (1–30)

Use these links to copy the next standalone tasks for Codex execution.

### Batch 1 (01–10)
- refactor_tasks/refactor_task_01_setup_service_template.md
- refactor_tasks/refactor_task_02_setup_http_client.md
- refactor_tasks/refactor_task_03_setup_ci_cd.md
- refactor_tasks/refactor_task_04_setup_service_discovery.md
- refactor_tasks/refactor_task_05_llm_gateway_extract_interfaces.md
- refactor_tasks/refactor_task_06_llm_gateway_extract_openai_provider.md
- refactor_tasks/refactor_task_07_llm_gateway_extract_retry_telemetry.md
- refactor_tasks/refactor_task_08_llm_gateway_setup_endpoints.md
- refactor_tasks/refactor_task_09_wire_monolith_to_llm_gateway.md
- refactor_tasks/refactor_task_10_llm_gateway_migrate_tests.md

### Batch 2 (11–20)
- refactor_tasks/refactor_task_11_orchestrator_extraction_discovery.md
- refactor_tasks/refactor_task_12_scaffold_orchestrator_service.md
- refactor_tasks/refactor_task_13_extract_executions_store_endpoints.md
- refactor_tasks/refactor_task_14_extract_stepqueue_adapter.md
- refactor_tasks/refactor_task_15_wire_monolith_to_orchestrator.md
- refactor_tasks/refactor_task_16_scaffold_runner_service.md
- refactor_tasks/refactor_task_17_extract_runner_endpoints.md
- refactor_tasks/refactor_task_18_wire_monolith_to_runner.md
- refactor_tasks/refactor_task_19_per_service_ci_qa.md
- refactor_tasks/refactor_task_20_parity_and_docs.md

### Batch 3 (21–30)
- refactor_tasks/refactor_task_21_services_extraction_discovery.md
- refactor_tasks/refactor_task_22_scaffold_planning_service.md
- refactor_tasks/refactor_task_23_extract_planning_endpoints.md
- refactor_tasks/refactor_task_24_wire_monolith_to_planning.md
- refactor_tasks/refactor_task_25_scaffold_repair_service.md
- refactor_tasks/refactor_task_26_extract_repair_endpoints.md
- refactor_tasks/refactor_task_27_scaffold_executor_service.md
- refactor_tasks/refactor_task_28_extract_executor_endpoints.md
- refactor_tasks/refactor_task_29_scaffold_clarification_service.md
- refactor_tasks/refactor_task_30_parity_ci_docs_all_services.md

---

## VALIDATION BEFORE SUBMISSION

Before providing the task files, validate:

1. **Count validation steps per task**: Each task should have 4-6 pre-execution validations and 5 post-execution validations
2. **Check time estimates**: Walk through each step mentally - does it fit in 30-45 min?
3. **Verify evidence claims**: Every claim about LOC, files, dependencies must reference your analysis
4. **Check command completeness**: Every validation command should be copy-pasteable and runnable
5. **Verify rollback procedures**: Each task should have clear rollback steps

---

## EXECUTION SEQUENCE

1. **Create REFACTOR_STATUS_CHECKLIST.md**
   - High-level overview of all 42+ tasks
   - Grouped by phase and service
   - With validation commands per group

2. **Create infrastructure tasks (1-4)**
   - Service template, HTTP client, CI/CD, discovery
   - These are prerequisites for all service extractions

3. **Create llm-gateway-service tasks (5-10)**
   - Follow the mandatory structure
   - Include all validation sections
   - Base evidence on your analysis

4. **Create runner-service tasks (11-15)**
   - Follow the mandatory structure
   - Include all validation sections
   - Base evidence on your analysis

5. **Create orchestrator-service tasks (16-23)**
   - Follow the mandatory structure
   - Include all validation sections
   - Base evidence on your analysis

6. **Create Phase 2 tasks (24-35)**
   - Domain services: planning, repair, executor
   - Follow same structure

7. **Create Phase 3 tasks (36-42)**
   - Supporting services: clarification, telemetry, ui
   - Follow same structure

8. **Validate all tasks**
   - Check structure compliance
   - Check validation command completeness
   - Check evidence references
   - Check time estimates

---

## START IMMEDIATELY

Begin by creating the REFACTOR_STATUS_CHECKLIST.md, then create all task files following the mandatory structure with pre- and post-execution validation sections.

**GO.**
