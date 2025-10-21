# AGENTS.md

## Metadata
- **Version:** 1.0.0
- **Enforcement:** Repository-wide, ALL AI builders, ALL sessions, ALL phases
- **Last Updated:** 2025-10-21
- **Authority:** Supreme law for all development (enforces CONSTITUTION.md)
- **Purpose:** Universal workflow for autonomous, evidence-driven coding

---

## 🎯 Project Overview

**What We're Building:**
A fully autonomous, multi-agent AI coding system with Replit/Copilot-class experience.

**Architecture:**
- **Smart MCA (LangGraph Supervisor)** - Routes, coordinates, escalates
- **Smart Specialists** - Planner, Implementer, Validator, etc. (LLM-powered analysis)
- **Zero-Trust Validator** - Independently verifies all claims
- **Microservices from day 1** - Monorepo with packages/gateway, packages/mca, etc.

**Stack:**
- OpenAI-only (GPT-4o/GPT-5) - NO Anthropic, NO multi-vendor in V1
- LangGraph JS + Postgres (state management)
- E2B Sandbox → Firecracker (code execution)
- MinIO (artifacts), Redis (message bus), OpenTelemetry (observability)

**Goal:** 90% autonomy, <$2/execution, enterprise-grade from line 1

---

## 🔒 Critical Rules (Numbered, Binary, Universal)

### 1. Evidence-Based ONLY
**No claim without saved, machine-verifiable evidence.**

❌ FORBIDDEN:
- "Tests probably pass" (without running them)
- "File likely at src/app.ts" (without searching)
- "Coverage seems good" (without coverage.json)

✅ REQUIRED:
- Run command → save output to `.automation/evidence/$TASK/`
- Search/read before editing → save discovery.txt
- Generate artifacts (junit.xml, coverage.json, sbom.json, sarif)

**Validation:** All claims must reference artifact URLs in MinIO or file paths in evidence directory.

---

### 2. Discover Before Act
**Search and read BEFORE editing. Path guessing is FORBIDDEN.**

❌ FORBIDDEN:
- Editing files without confirming they exist
- Assuming directory structure
- Using phrases like "should be at" or "probably in"

✅ REQUIRED workflow:
```bash
# 1. Search for target
grep -r "pattern" packages/
# or
find packages/ -name "*.ts"

# 2. Read to understand context
cat packages/gateway/src/server.ts

# 3. Save discovery proof
echo "Found target at packages/gateway/src/server.ts" > .automation/evidence/$TASK/discovery.txt

# 4. NOW edit
# (edit with full context)
```

**Validation:** discovery.txt must exist before any file edits.

---

### 3. Technology Stack (LOCKED - Cannot Change)

**APPROVED (ONLY use these):**

**Languages:**
- ✅ TypeScript/JavaScript (Node.js 20+) - backend services
- ✅ React/Next.js - frontend UI

**LLM Provider:**
- ✅ OpenAI ONLY (GPT-4o, GPT-5 when available)
- ❌ NO Anthropic Claude
- ❌ NO multi-vendor in Vertical Slice #1

**Orchestration:**
- ✅ LangGraph JS + Postgres Checkpointer

**Code Generation:**
- ✅ OpenAI Function Calling with custom `edit_file` tool
- ❌ NOT Anthropic Text Editor Tool
- ❌ NOT Aider CLI

**Execution:**
- ✅ E2B Sandbox (pilot)
- ✅ Firecracker (production migration path documented)

**Storage & State:**
- ✅ Postgres 16+ (LangGraph checkpointer, database)
- ✅ MinIO (S3-compatible artifacts)
- ✅ Redis Streams (message bus, migrate to NATS at scale)

**Observability:**
- ✅ OpenTelemetry + Tempo + Grafana
- ✅ Langfuse (LLM cost tracking)

**FORBIDDEN:**
- ❌ Anthropic (use OpenAI-only)
- ❌ SQLite (not production-grade)
- ❌ In-memory storage without persistence
- ❌ Monolithic architecture
- ❌ Custom implementations of battle-tested tools

**Validation:** CI checks `package.json` for forbidden dependencies (`@anthropic-ai/sdk` auto-fails build).

---

### 4. Architecture (LOCKED - Cannot Change)

**REQUIRED:**
- ✅ Microservices from day 1 (packages/gateway, packages/mca, packages/planner, etc.)
- ✅ Monorepo with Turborepo
- ✅ Smart MCA (LLM-powered LangGraph supervisor)
- ✅ Smart Specialists (each agent uses LLM to analyze results, not just return raw tool output)
- ✅ Zero-Trust Validator (independently verifies all claims)

**FORBIDDEN:**
- ❌ Monolith architecture ("we'll extract microservices later")
- ❌ Dumb orchestrator with smart workers only
- ❌ Workers that self-report without independent validation
- ❌ Shared database across services (each service owns its data)

**Example (RIGHT):**
```
packages/
  gateway/        # HTTP API entry point
  mca/            # Smart coordinator (LangGraph)
  planner/        # Task decomposition (OpenAI Structured Outputs)
  implementer/    # Code generation (OpenAI Function Calling)
  runner/         # Test execution (E2B Sandbox)
  validator/      # Zero-trust verification (pytest + LLM judge)
  contracts/      # OpenAPI specs, JSON schemas
```

**Validation:** PR rejected if new code added to monolithic `src/` instead of `packages/service-name/`.

---

### 5. Validation Gates (MUST PASS - In Order)

**Every task runs these gates in sequence:**

```bash
# G1: Lint
npm run lint
# Exit code MUST be 0

# G2: TypeScript Check
npm run typecheck
# Exit code MUST be 0

# G3: Tests + Coverage
npm test -- --coverage
# Exit code MUST be 0
# Line coverage MUST be ≥80%

# G4: Custom Acceptance Criteria
# (defined in task DoD, e.g., "POST /api/tasks returns 201")
```

**CRITICAL:** If ANY gate fails → iterate (fix → retry), don't just report.

❌ WRONG:
```typescript
const lintResult = exec("npm run lint");
if (lintResult.exitCode !== 0) {
  return { status: "failed", error: lintResult.stderr };
}
```

✅ RIGHT:
```typescript
let attempts = 0;
while (attempts < 3) {
  const lintResult = exec("npm run lint");
  if (lintResult.exitCode === 0) break;
  
  // FIX the issue
  await fixLintErrors(lintResult.stderr);
  attempts++;
}

if (attempts === 3) {
  escalate("Lint failed after 3 attempts", lintResult.stderr);
}
```

**Validation:** CI enforces all gates; PRs auto-rejected if any gate fails.

---

### 6. Iteration Protocol (CRITICAL - This is Autonomy)

**If validation fails (lint, test, gate):**

```
1. DIAGNOSE
   - Read error logs carefully
   - Understand root cause (not symptoms)
   - Check if issue is in code, config, or dependencies

2. FIX
   - Adjust implementation (NOT architecture, unless approved)
   - Use smallest possible change
   - Don't introduce new issues

3. RETRY
   - Re-run exact same validation command
   - Capture new output

4. EVIDENCE
   - Save attempt to .automation/evidence/$TASK/iterations/attempt-N.md
   - Include: error, diagnosis, fix, result

5. REPEAT
   - Max 3 iterations per issue
   - Each iteration must try a DIFFERENT fix
```

**After 3 failed attempts:**

🚨 **ESCALATE** with:
- Issue description
- What was tried (3 attempts with evidence)
- Complete error logs (last attempt)
- Proposed solution OR "need architectural guidance"

**Examples of iteration (DO these):**
- ✅ Dependency version conflict? Try compatible versions until tests pass
- ✅ Test failing? Fix code logic and re-run until green
- ✅ Port already in use? Change port in .env and retry
- ✅ Schema validation error? Adjust Zod schema until strict mode passes
- ✅ Import error? Add missing dependency to package.json and retry

**NOT iteration (escalate immediately):**
- ❌ Architecture decision needed (Smart MCA vs Dumb orchestrator)
- ❌ Want to use non-approved tech (Anthropic instead of OpenAI)
- ❌ Security vulnerability found in dependency
- ❌ Need to refactor multiple services (scope too large)

**SUCCESS CRITERIA:** All gates PASS (green), NOT "followed protocol and reported errors."

**Validation:** Evidence directory must contain iterations/ folder with attempt logs if any failures occurred.

---

### 7. Evidence Requirements (Directory Structure)

**Every task MUST produce:**

```
.automation/evidence/$TASK/
  discovery.txt          # Proof targets exist before editing (grep/find output)
  baseline.json          # Metrics before change (tests, coverage, lint)
  final.json             # Metrics after change (gates passed)
  valid/
    lint.txt             # npm run lint output (exit 0)
    typecheck.txt        # npm run typecheck output (exit 0)
    tests.json           # npm test --json output (all passing)
    coverage.json        # Coverage report (≥80% line coverage)
  iterations/            # (if any failures occurred)
    attempt-1.md         # First fix attempt
    attempt-2.md         # Second fix attempt
    attempt-3.md         # Third fix attempt (if needed)
  artifacts.sha256       # SHA256 hashes of all changed files
  task_provenance.json   # {task_id, files_changed[], commands_run[], timestamp}
  audit.json             # npm audit --json (no new high/critical)
  env.txt                # node -v, npm -v, git rev-parse HEAD
  summary.md             # Markdown summary with links to all artifacts
```

**Artifacts in MinIO:**
```
s3://evidence/$EXEC_ID/
  plan.json              # Planner output
  code/                  # Generated files
    src/app.ts
    src/app.test.ts
  junit.xml              # Test results (Runner)
  coverage.json          # Coverage data (Runner)
  validator-junit.xml    # Validator's independent test run
  sarif/                 # Security scan results
    semgrep.sarif
  sbom.json              # Software Bill of Materials
  trace-id.txt           # OpenTelemetry trace ID
```

**Validation:** PR rejected if .automation/evidence/$TASK/summary.md doesn't exist.

---

### 8. Constitutional Compliance (From CONSTITUTION.md)

**Production from Line 1:**
- ✅ NO stubs (`throw new Error("TODO: implement")`)
- ✅ NO placeholders (`const TODO = null;`)
- ✅ NO deferred infrastructure ("we'll add tests later")
- ✅ Build final architecture NOW

**Battle-Tested Tools:**
- ✅ Use existing libraries (LangGraph, OpenAI SDK, E2B, MinIO client)
- ❌ NO custom implementations (HTTP clients, retry logic, loggers)
- ✅ If library exists, USE IT

**Vertical Slices:**
- ✅ Complete one feature end-to-end before starting next
- ✅ Each slice delivers working, tested, deployed code
- ❌ NO horizontal layers ("let's build all models first")

**Binary Gates:**
- ✅ PASS or FAIL (with evidence)
- ❌ NO subjective ("looks good", "seems fine")

**No Refactoring Debt:**
- ✅ Build correctly the first time
- ❌ NO "build monolith, extract later"
- ❌ NO "use custom, replace with library later"

**Validation:** ADRs required for any "temporary" decisions; repository owner must approve.

---

## 🚫 Forbidden Patterns (Auto-Detectable)

| Pattern | Regex | Violation | Action |
|---------|-------|-----------|--------|
| Path guessing | `(?i)\b(think\|probably\|should be at\|likely in)\b` | Claims without discovery | HALT, run grep/find first |
| Hardcoded success | `return\s*\{\s*success:\s*true\s*\}` | Fake validation | HALT, implement real checks |
| TypeScript any | `:\s*any\b` | Type unsafety | Fix with proper types |
| TODO/FIXME in src/ | `(?i)src/.*\b(TODO\|FIXME)\b` | Incomplete work | Complete or move to ADR |
| Console.log in src/ | `src/.*console\.log` | Noisy logs | Use proper logger (winston/pino) |
| Anthropic imports | `from\s+['"]@anthropic` | Wrong LLM vendor | Use OpenAI |
| Monolith src/ | `^src/(?!.*packages/)` | Violates microservices | Move to packages/service-name/ |
| Stub functions | `throw new Error\(.*TODO.*\)` | Not production-ready | Implement fully |

**Validation:** Pre-commit hooks run these checks; violations block commit.

---

## 🔄 Error Handling (When to Iterate vs Escalate)

### ITERATE (Fix → Retry, Max 3x):
- ✅ Lint errors (missing semicolons, unused vars)
- ✅ TypeScript errors (type mismatches, missing imports)
- ✅ Test failures (logic bugs, assertion errors)
- ✅ Dependency conflicts (version incompatibilities)
- ✅ Port conflicts (change port number)
- ✅ Schema validation errors (adjust Zod schema)
- ✅ Coverage below 80% (add more tests)
- ✅ Network timeouts (increase timeout, add retry)

### ESCALATE (After 3 Attempts OR Immediately):
- 🚨 Architecture decision needed (which pattern to use?)
- 🚨 Technology not in approved stack (want to use Anthropic)
- 🚨 Security vulnerability (dependency has CVE)
- 🚨 Scope creep (task requires refactoring multiple services)
- 🚨 Budget exceeded (task cost >$2 in LLM calls)
- 🚨 Deadline at risk (task taking >4 hours)
- 🚨 Data loss risk (migration might delete data)
- 🚨 Breaking change required (contract must change)

**Escalation Format:**
```markdown
## ESCALATION: [Brief Title]

**Context:** [What task were you trying to complete?]

**Problem:** [What went wrong?]

**Attempts:**
1. Tried [approach 1] → [result]
2. Tried [approach 2] → [result]  
3. Tried [approach 3] → [result]

**Evidence:**
- Attempt 1: .automation/evidence/task-123/iterations/attempt-1.md
- Attempt 2: .automation/evidence/task-123/iterations/attempt-2.md
- Attempt 3: .automation/evidence/task-123/iterations/attempt-3.md
- Error logs: [paste last error]

**Proposed Solution:**
[Your recommendation OR "need architectural guidance"]

**Impact:**
- Blocks: [which other tasks depend on this?]
- Cost so far: [LLM tokens used]
- Time spent: [hours]
```

---

## 📚 Reference Files (Read Before Work)

**Constitutional Law:**
1. `CONSTITUTION.md` - Supreme law (immutable principles)
2. `AGENTS.md` - This file (universal workflow)

**Architecture Decisions:**
3. `ARCHITECTURE_DECISION.md` - Smart MCA rationale
4. `VERTICAL_1_TOOLING.md` - Production tool stack
5. `VERTICAL_1_PLAN.md` - 8-week implementation roadmap

**Implementation Guide:**
6. `AI_INSTRUCTIONS.md` - Code patterns and examples
7. `packages/contracts/openapi/*.yaml` - Service contracts
8. `packages/contracts/schema/*.json` - Message schemas

**DO NOT start work without reading items 1-4.**

---

## 🎯 Success Metrics (How We Measure You)

### Autonomy (Primary Goal):
- **Target:** 90% of tasks complete without human intervention
- **Measured:** `completed_tasks / (completed_tasks + escalated_tasks)`
- **Gate:** If autonomy <70%, re-evaluate agent design

### Cost Efficiency:
- **Target:** <$2 per execution (all LLM calls combined)
- **Measured:** Langfuse cost reports per trace
- **Gate:** If cost >$3, optimize prompts or reduce LLM calls

### Quality:
- **Target:** 0 high/critical security findings, ≥80% coverage, all tests passing
- **Measured:** SARIF results, coverage.json, junit.xml
- **Gate:** Any critical finding blocks merge

### Iteration Efficiency:
- **Target:** <2 iterations per task on average
- **Measured:** Count of `.automation/evidence/$TASK/iterations/attempt-*.md` files
- **Gate:** If avg iterations >3, improve validation logic

### Evidence Completeness:
- **Target:** 100% of tasks have complete evidence directories
- **Measured:** CI checks for summary.md, valid/, artifacts.sha256
- **Gate:** Missing evidence = PR rejected

---

## 🔐 Final Reminder

**You are building an ENTERPRISE SYSTEM, not a prototype.**

- Every line of code is production-grade
- Every decision is evidence-backed  
- Every gate is binary (PASS/FAIL)
- Every service is isolated (microservices)
- Every iteration brings you closer to PASS (not just "tried")
- Every escalation includes 3 attempts + evidence

**Iteration to green is autonomy. Reporting errors is not.**

**Enterprise from Line 1. Always.**

---

## Appendix: Quick Decision Tree

```
┌─ New task assigned
│
├─ 1. Did you read CONSTITUTION.md + AGENTS.md?
│   NO → STOP, read them now
│   YES → Continue
│
├─ 2. Does this require architecture change?
│   YES → Create ADR, get approval, THEN implement
│   NO → Continue
│
├─ 3. Does target file/service exist?
│   DON'T KNOW → Run grep/find, save discovery.txt
│   YES → Continue
│
├─ 4. Implement change
│
├─ 5. Run validation gates (lint → typecheck → test)
│   FAIL → Iterate (diagnose → fix → retry, max 3x)
│   PASS → Continue
│
├─ 6. Save evidence (.automation/evidence/$TASK/)
│
├─ 7. Upload artifacts to MinIO
│
└─ 8. Mark task COMPLETE (if all gates PASS) or ESCALATE (if 3 iterations failed)
```

---

**Version History:**
- 1.0.0 (2025-10-21): Initial version for Vertical Slice #1

**Last Updated:** 2025-10-21  
**Next Review:** After Vertical Slice #1 completion (Week 8)
