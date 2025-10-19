# CRITICAL DECISION: REFACTOR NOW OR COMPLETE PHASE 21 FIRST?

## CONTEXT

**Code Owner Decision**: Microservice refactor is **APPROVED**. All repository constraints have been lifted by code owner authority.

**Current Situation**:
- Phase 21 (G3.1) is IN PROGRESS with 15 pending tasks
- Codebase is growing, context limits are being hit
- Multiple AIs working on same files causes conflicts
- Debugging complexity increasing exponentially

**Refactor Proposal**: Comprehensive microservice architecture pivot as detailed in `docs/07_171025_todays_status/20_microservice_pivot.md`

**Your Mission**: Determine whether to refactor NOW or complete Phase 21 tasks FIRST.

---

## MANDATORY ANALYSIS REQUIREMENTS

### Step 1: Read the Refactor Proposal
**File**: `docs/07_171025_todays_status/20_microservice_pivot.md`

**Extract**:
- Proposed microservice architecture (number of services, boundaries)
- Migration strategy (phases, timeline)
- Risk assessment and mitigations
- Success criteria
- Communication patterns (HTTP vs message queue)

### Step 2: Analyze Current Repository State

**Run these commands and analyze output**:

```bash
# Total lines of code
find src -name "*.ts" | xargs wc -l | tail -1

# Number of files
find src -name "*.ts" | wc -l

# Largest files (context-heavy)
find src -name "*.ts" | xargs wc -l | sort -rn | head -20

# Module interdependencies
grep -r "from '\.\." src/ | wc -l

# Test file count
find tests -name "*.test.ts" | wc -l

# Current test runtime
time npm test 2>&1 | grep -E "(Tests|Time)"
```

**Analyze**:
- Are any files >500 LOC? (AI context warning)
- Are any files >1000 LOC? (AI context critical)
- How many cross-module imports exist? (coupling indicator)
- What is current test suite runtime? (deployment indicator)

### Step 3: Map Phase 21 Tasks to Proposed Services

For each of the 15 tasks in `docs/09_191025_todays_status/tasks/`, identify:

**Which proposed microservice does this task belong to?**
- orchestrator-service
- planning-service  
- repair-service
- executor-service
- runner-service
- llm-gateway-service
- clarification-service
- telemetry-service
- ui-service

**Example Mapping**:
```
task_01_fix_openai_validation.md → llm-gateway-service
task_02_implement_clarify_node.md → orchestrator-service
task_03_implement_plan_node.md → orchestrator-service
task_04_implement_generate_node.md → orchestrator-service
...
```

**Count tasks per proposed service**:
- If most tasks touch orchestrator-service: High refactor risk (monolith is tightly coupled)
- If tasks are spread evenly: Lower refactor risk (services have clear boundaries)

### Step 4: Estimate Technical Debt Growth

**Analysis Required**:

**Scenario A: Complete Phase 21 First (15 tasks × 45 min = ~11 hours work)**
- How many NEW files will be added to monolith?
- How many NEW cross-module dependencies?
- How much will largest files grow?
- Will any file exceed 1000 LOC?

**Scenario B: Refactor Now, Then Complete Phase 21**
- Migration time: 2-5 weeks (per refactor proposal)
- After refactor: Each task touches single, isolated service
- Technical debt: Minimal growth (services are isolated)

**Calculate**:
```
Technical Debt Index = (LOC in largest file) × (cross-module imports) / (test coverage %)

Current TDI = ?
After Phase 21 (no refactor) TDI = ?
After Refactor TDI = ?
```

### Step 5: Risk-Benefit Analysis

**Complete a decision matrix**:

| Factor | Refactor Now | Phase 21 First |
|--------|--------------|----------------|
| **Time to complete Phase 21** | ? | ? |
| **Context fit for AI** | ? | ? |
| **Risk of bad code spreading** | ? | ? |
| **Parallel AI development** | ? | ? |
| **Test isolation** | ? | ? |
| **Rollback capability** | ? | ? |
| **Migration risk** | ? | ? |
| **Deployment complexity** | ? | ? |

**Scoring**:
- ✅ = Advantage
- ⚠️ = Neutral
- ❌ = Disadvantage

### Step 6: Consult Contract Requirements

**Check Phase 21 Contract**:
`contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json`

**Questions**:
- Does the contract specify monolithic architecture?
- Does the contract allow microservice migration?
- Are there deadlines that would be jeopardized by refactoring?
- Are there external dependencies that require the current architecture?

### Step 7: Review Recent Failure Patterns

**Analyze recent errors**:
```bash
# Recent error patterns
tail -100 events.log | grep -E "(error|failed|invalid)" | jq -r '.name' | sort | uniq -c | sort -rn

# Which modules are failing most?
grep -r "Error:" src/ | cut -d: -f1 | sort | uniq -c | sort -rn | head -10

# Are failures clustered in specific domains?
```

**Questions**:
- Are failures concentrated in specific modules that would become services?
- Would service isolation have prevented recent failures?
- Is the current debugging difficulty a strong signal for refactoring?

---

## DECISION CRITERIA

### Refactor NOW if:
- [ ] Any file exceeds 1000 LOC (AI context critical)
- [ ] Cross-module imports > 200 (high coupling)
- [ ] >50% of Phase 21 tasks touch orchestrator-service (monolith bottleneck)
- [ ] Recent failures span multiple modules (cascade risk)
- [ ] Test suite runtime > 2 minutes (deployment pain)
- [ ] Technical Debt Index projected to grow >50% after Phase 21

### Complete Phase 21 FIRST if:
- [ ] All files < 500 LOC (AI context safe)
- [ ] Phase 21 tasks are evenly distributed across proposed services (low coupling)
- [ ] No recent cross-module failure cascades
- [ ] Test suite runtime < 1 minute
- [ ] Contract has imminent deadline
- [ ] Technical Debt Index projected growth < 30%

---

## REQUIRED DELIVERABLE

Provide a comprehensive analysis report with the following structure:

### 1. Current Repository Metrics
```
Total LOC: [number]
Number of .ts files: [number]
Largest file: [path] ([LOC] lines)
Cross-module imports: [number]
Test count: [number]
Test runtime: [time]
```

### 2. Phase 21 Task Distribution
```
orchestrator-service: [N] tasks
planning-service: [N] tasks
repair-service: [N] tasks
executor-service: [N] tasks
runner-service: [N] tasks
llm-gateway-service: [N] tasks
clarification-service: [N] tasks
telemetry-service: [N] tasks
ui-service: [N] tasks
```

### 3. Technical Debt Projection
```
Current TDI: [number]
After Phase 21 (no refactor): [number] (+X%)
After Refactor: [number] (-Y%)
```

### 4. Decision Matrix (completed with ✅/⚠️/❌)

### 5. Risk Assessment
- **If refactor now**: [List risks and mitigations]
- **If Phase 21 first**: [List risks and mitigations]

### 6. Contract Compliance Check
- **Does contract allow microservices?** [Yes/No + evidence]
- **Are there blocking deadlines?** [Yes/No + dates]

### 7. Recommendation
**[REFACTOR NOW] or [COMPLETE PHASE 21 FIRST]**

**Rationale**: [3-5 bullet points with evidence]

**Timeline**:
- [Chosen path]: [estimated time]
- Key milestones: [list]

**Success Criteria**: [measurable outcomes]

---

## CONSTRAINTS

❌ **DO NOT**:
- Make recommendation without running analysis commands
- Ignore the refactor proposal details
- Assume code owner constraints still apply (they are LIFTED)
- Provide vague or gut-feeling recommendations
- Skip the technical debt calculation

✅ **MUST**:
- Run all analysis commands and include output
- Read the full refactor proposal document
- Map all 15 Phase 21 tasks to proposed services
- Calculate Technical Debt Index for all scenarios
- Complete the decision matrix with evidence
- Provide concrete timeline estimates
- Include measurable success criteria
- Reference specific files, line counts, and metrics

---

## EXECUTION SEQUENCE

1. **Read** `docs/07_171025_todays_status/20_microservice_pivot.md` in full
2. **Run** all repository analysis commands
3. **Map** Phase 21 tasks to proposed services
4. **Calculate** Technical Debt Index for current, Phase 21 first, and refactor now scenarios
5. **Complete** decision matrix with evidence
6. **Review** Phase 21 contract for constraints
7. **Analyze** recent failure patterns
8. **Compile** comprehensive report
9. **Make** clear recommendation with timeline

---

## CRITICAL NOTES

**Context from Code Owner**:
- Development team = Human (non-technical) + AI assistants only
- AI context limits are REAL and causing problems
- Recent OpenAI validation bug shows cascade risk
- Microservice refactor is APPROVED by code owner
- No technical constraints remain

**From Refactor Proposal**:
- 9 proposed services total
- 6 core services + 3 supporting
- Migration timeline: 2-5 weeks
- Success metric: Each service <2000 LOC
- Pattern: HTTP REST initially, message queue if needed

**From Phase 21 Status**:
- 15 tasks remaining
- Estimated 11-12 hours total work
- Discovery complete, implementation in progress
- Some tasks touch multiple files/modules

---

## START ANALYSIS NOW

Begin by reading the refactor proposal, then run the analysis commands, then provide the comprehensive report with clear recommendation.

**GO.**