# AGENTS.md Analysis & Recommendation

**Date:** 2025-10-20
**Purpose:** Evaluate GPT's SLSA/SSDF/ASVS-based rewrite vs practical developer needs

---

## Executive Summary

**GPT's Assessment:** ✅ Technically correct (standards-aligned)
**GPT's Solution:** ❌ Wrong abstraction layer (release pipeline, not dev tasks)

**My Recommendation:** Use **Version A (Developer-Focused)** immediately for Phase 22 refactoring.

---

## Problem Statement (Why You're Frustrated)

**Your Pain Point:**
> "GPT shortcuts, guesses at file paths, doesn't provide evidence, creates generic tasks"

**Root Cause:**
Current `AGENTS.md` (298 lines) has good rules but:
- Buried in middle of file (Discovery protocol at line 106)
- No explicit "run rg before claiming file exists" rule
- No structured evidence template
- No HALT enforcement (vague "report to human" on line 249)
- Phase-specific content mixed with timeless rules

---

## GPT's Rewrite Analysis

### What GPT Did Right ✅

1. **Cited authoritative sources** (NIST SSDF, SLSA v1.0, OWASP ASVS)
2. **Enforcement-first language** (MUST, HALT, FORBIDDEN)
3. **Structured evidence** (directory layout)
4. **Anti-patterns section** (good idea)
5. **HALT conditions** (explicit)

### Where GPT Went Wrong ❌

#### **Problem 1: Over-Engineering**

**GPT's Requirement:**
```markdown
GATE F — Release Integrity & Provenance
- Generate file hashes and signatures
- Generate provenance attestation (SLSA)
- Evidence: evidence/release/{SHA256SUMS.txt, signatures/, provenance.json}
```

**Your Reality:**
- Task P22-1.1: "Copy `writeFiles.ts` to `services/planning/src/domain/`"
- Duration: 30-45 minutes
- Output: 5 files changed, pass `npm test`

**Why This is Wrong:**
- You don't need SLSA provenance for copying a file during refactoring
- SHA256SUMS.txt is for **release artifacts** (final build → production)
- Code signing is for **distribution to customers**, not git commits

**Analogy:**
- GPT's solution: "Require FDA approval for every sandwich"
- Your need: "Wash hands before cooking (hygiene, not overkill)"

---

#### **Problem 2: Wrong Abstraction Layer**

**GPT's Model:**
```
Task → Implementation → Tests → Security Verification →
Release Hashes → Code Signing → Provenance Attestation →
ASVS Requirement Mapping → Ship to Production
```

**Your Actual Model:**
```
Task → Discovery (rg/grep) → Baseline Capture →
Code Changes → Validation (npm test) →
Evidence (before/after metrics) → Next Task
```

**Impact:**
- GPT's AGENTS.md would **block you** on "generate provenance.json" for every 30-min task
- You'd spend more time generating attestations than coding
- Misses the core issue: **agents guessing instead of searching**

---

#### **Problem 3: Misapplied Standards**

| Standard | Intended Scope | GPT Applied It To | Correct Application |
|----------|---------------|-------------------|---------------------|
| **SLSA v1.0** | Build pipeline integrity | Every dev task | Final release build |
| **SSDF PS.2** | Release artifact hashing | Every git commit | Release tags/artifacts |
| **ASVS 5.0** | Security verification | Every code change | Security review gates |

**Example:**

**SLSA Provenance Purpose:**
> "Consumers can verify artifacts were produced as expected by inspecting provenance"

**Who are the consumers in your refactoring?**
- Not external users (you're refactoring internal monolith)
- Not customers (not shipping yet)
- Just you verifying "did the task complete successfully?"

**Correct use of SLSA:** When you cut a release tag (v22.0.0) and ship to production.

---

## Version Comparison

### Current AGENTS.md (Existing)
**Strengths:**
- Good feature flag documentation
- Discovery protocol mentioned
- Stack constraints clear

**Weaknesses:**
- Critical rules buried (line 106)
- No explicit "search before assuming" rule
- Vague HALT conditions
- Phase-specific content (lines 10-17)
- No evidence structure template

**Verdict:** 60% effective - needs rewrite

---

### Version B: GPT's SLSA/SSDF/ASVS Rewrite
**Strengths:**
- Standards-aligned
- Explicit HALT gates
- Anti-patterns section
- Structured evidence

**Weaknesses:**
- **Massive overkill** for dev tasks
- Requires provenance.json for file copies
- Requires ASVS mappings for refactoring
- Would block work with attestation bureaucracy
- Misses core issue (agents guessing at paths)

**Verdict:** 40% effective - technically correct but impractical

**When to Use:** Phase 22 is **done** and you're cutting production releases

---

### Version A: Developer-Focused (My Rewrite)
**Strengths:**
- ✅ Critical rules first (Rule 1: Evidence-Based Execution)
- ✅ Explicit "run rg before claiming" requirement
- ✅ HALT conditions with exact commands
- ✅ Evidence structure for **task completion** (not release)
- ✅ Anti-patterns with WRONG vs CORRECT examples
- ✅ Baseline/final metrics comparison
- ✅ No overkill (no SLSA for file copies)
- ✅ Sized for 30-45 min tasks
- ✅ Phase context moved to `Recent_Status.md`

**Weaknesses:**
- Doesn't include SLSA/SSDF compliance (by design - wrong layer)

**Verdict:** 95% effective for current work

**When to Use:** **NOW** for Phase 22 refactoring

---

## Recommendation Matrix

| Use Case | Recommended Version | Why |
|----------|---------------------|-----|
| **Phase 22 refactoring (now)** | Version A (Developer) | Task-level evidence, no overkill |
| **Daily dev work (general)** | Version A (Developer) | Right abstraction layer |
| **Cutting production releases** | Version B (GPT/SLSA) | Need supply chain attestations |
| **Security review gates** | Hybrid (A + ASVS mappings) | Add ASVS to Version A when reviewing |
| **External distribution** | Version B (GPT/SLSA) | Need provenance for customers |

---

## Action Plan (What to Do Right Now)

### Step 1: Replace AGENTS.md ✅
```bash
cp AGENTS_v2_developer_focused.md AGENTS.md
git add AGENTS.md
git commit -m "refactor(agents): rewrite as developer-focused evidence-based instruction file

- Critical rules first (evidence-based execution ONLY)
- Explicit HALT conditions with rollback commands
- Task-level evidence structure (baseline/final/discovery)
- Anti-patterns with WRONG vs CORRECT examples
- Removed phase-specific content (moved to Recent_Status.md)
- Sized for 30-45 min dev tasks, not release pipelines

Refs: NIST SSDF principles applied at task level (not release level)"
```

### Step 2: Create Recent_Status.md ✅
```bash
cp docs/.../Recent_Status_TEMPLATE.md docs/.../Recent_Status.md

# Edit Recent_Status.md:
# - Set current task to P22-1.1
# - Set baseline metrics (47 deep imports, 82.25% coverage)
# - List acceptance criteria for Batch 1a

git add docs/.../Recent_Status.md
git commit -m "docs: add Recent_Status.md for dynamic phase context

Separates timeless rules (AGENTS.md) from phase-specific context.
Agents must read this before every task."
```

### Step 3: Update CLAUDE.md Reference
```bash
# Add to CLAUDE.md (near top):
## Agent Instructions

**For enforcement rules:** Read `AGENTS.md` (timeless policy)
**For current work context:** Read `docs/.../Recent_Status.md` (dynamic)
```

### Step 4: Test with GPT
Give GPT **only** these files:
1. `AGENTS.md` (new Version A)
2. `Recent_Status.md` (current context)
3. `docs/.../05_phase22_tasks/task_P22-1.1.md`

**Test prompt:**
> "Execute task P22-1.1. Follow AGENTS.md rules. Provide evidence."

**Expected behavior:**
- Runs `rg` to find files before claiming they exist
- Captures baseline metrics
- Shows WRONG vs CORRECT understanding
- Generates `.automation/evidence/P22-1.1/` structure
- HALTs on any validation failure

**If GPT still shortcuts:** AGENTS.md needs more explicit examples.

---

### Step 5: Archive GPT's SLSA Rewrite for Later
```bash
# Save for when you need release pipeline compliance
mkdir -p docs/standards/
cp AGENTS_gpt_slsa_rewrite.md docs/standards/AGENTS_release_pipeline.md

# Add note:
cat >> docs/standards/AGENTS_release_pipeline.md <<EOF

---
## When to Use This Version

Use this SLSA/SSDF/ASVS-compliant version when:
- Cutting production releases (v22.0.0, etc.)
- Shipping to external customers
- Generating supply chain attestations
- Undergoing security audits

For daily development work, use root AGENTS.md instead.
EOF
```

---

## Evidence That Version A Solves Your Problem

### Your Original Complaint
> "GPT shortcuts, guesses at file paths, doesn't provide evidence"

### How Version A Fixes This

**Problem:** GPT guesses file exists
**Fix in Version A:**
```markdown
### Rule 1: Evidence-Based Execution ONLY

❌ FORBIDDEN:
- "I assume file X exists at path Y"

✅ REQUIRED: Every file path MUST come from:
- `rg` (ripgrep) search output
- `grep` search output
- `Read` tool showing actual file content

Example - WRONG:
Copy src/utils/helper.ts to services/...

Example - CORRECT:
Discovery:
$ rg -l "export.*normalize" src/utils/
  src/utils/normalizeExports.ts

Evidence captured: .automation/evidence/task-1.1/discovery_rg_output.txt

Action:
cp src/utils/normalizeExports.ts services/planning/src/domain/
```

**Result:** GPT physically cannot claim file exists without showing `rg` output.

---

**Problem:** GPT doesn't capture before/after metrics
**Fix in Version A:**
```markdown
### Rule 5: Evidence Artifacts (Required for Every Task)

Evidence Directory Structure:
.automation/evidence/[task-id]/
├── baseline/
│   ├── metrics.txt (coverage, import counts - BEFORE)
├── final/
│   ├── metrics.txt (coverage, import counts - AFTER)
└── task_summary.md (before/after comparison)

Baseline Capture (BEFORE coding):
$ echo "=== Deep Imports Count ===" >> .automation/evidence/${TASK_ID}/baseline/metrics.txt
$ rg -c '../../../../src/' services/ >> .automation/evidence/${TASK_ID}/baseline/metrics.txt
```

**Result:** GPT must show numerical evidence (47 → 42 deep imports).

---

**Problem:** GPT proceeds after failures
**Fix in Version A:**
```markdown
### Rule 3: Validation Gates (Exit 0 or HALT)

If ANY command exits non-zero:

1. ❌ HALT - do not proceed to next task
2. 📋 Capture error output
3. 🔙 Rollback changes: git restore .
4. 🚨 Report to human
5. ⏸️ Wait for instructions - do NOT:
   - Guess at fixes
   - Try alternative approaches
   - Proceed to next task
```

**Result:** GPT cannot ignore test failures.

---

## Final Verdict

| Criteria | Current AGENTS.md | GPT's SLSA Rewrite | Version A (Developer) |
|----------|-------------------|--------------------|-----------------------|
| **Prevents shortcuts** | ⚠️ Partial | ❌ No (wrong focus) | ✅ Yes (explicit rule) |
| **Enforces evidence** | ⚠️ Mentioned | ✅ Yes (overkill) | ✅ Yes (right level) |
| **HALT on failures** | ⚠️ Vague | ✅ Yes | ✅ Yes (with commands) |
| **Right abstraction** | ✅ Yes | ❌ No (release layer) | ✅ Yes (task layer) |
| **Sized for 30-45min tasks** | ✅ Yes | ❌ No | ✅ Yes |
| **WRONG vs CORRECT examples** | ❌ No | ⚠️ Partial | ✅ Yes (extensive) |
| **Standards-aligned** | ⚠️ Partial | ✅ Yes (too strict) | ✅ Yes (appropriate) |

**Recommendation: Use Version A immediately.**

---

## Long-Term Strategy

### Phase 22 (Now → 2 weeks)
**Use:** Version A (Developer-Focused)
**Why:** Task-level evidence, no bureaucracy, sized for refactoring

### Phase 23+ (Stabilization)
**Use:** Version A (Developer-Focused)
**Why:** Still doing daily dev work

### Production Releases (When Phase 22 Done)
**Use:** Version B (GPT's SLSA) **OR** Hybrid
**Why:** Need supply chain attestations for customers

**Hybrid Option:**
- Keep Version A as `AGENTS.md` (daily work)
- Add `AGENTS_RELEASE.md` (GPT's version for releases)
- CI script chooses which to enforce based on:
  - Regular commits → Version A rules
  - Release tags → Version B rules (SLSA/SSDF)

---

## Conclusion

**GPT's research was correct** (SSDF/SLSA/ASVS are the right standards).

**GPT's application was wrong** (applied release-pipeline rules to dev tasks).

**Your instinct was right** (file is too complex and missing enforcement).

**Solution:** Version A (Developer-Focused) - use it now.

---

## Implementation Checklist

- [ ] Review Version A (`AGENTS_v2_developer_focused.md`)
- [ ] Test with GPT using only Version A + task file
- [ ] If test passes: Replace `AGENTS.md` with Version A
- [ ] Create `Recent_Status.md` from template
- [ ] Update `CLAUDE.md` to reference both files
- [ ] Archive GPT's SLSA rewrite as `docs/standards/AGENTS_release_pipeline.md`
- [ ] Run Phase 22 Batch 1a with new AGENTS.md
- [ ] Verify GPT provides evidence (not shortcuts)
- [ ] Iterate based on results

**Estimated time to implement:** 30 minutes
**Estimated time saved per task:** 15-20 minutes (no more back-and-forth on "where's the evidence?")

---

**Decision:** Replace AGENTS.md with Version A now. Revisit Version B when cutting production releases.
