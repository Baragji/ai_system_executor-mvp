# Task Assignment: PA01 - Discovery & Contract Validation

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA01
**Duration:** 30 minutes
**Prerequisites:** None (starting task)

---

## 📋 Task Overview

Read and validate the Phase 2 contract, understand the CDI workflow, and prepare for execution.

---

## 📖 Step 1: Read the Contract

**File to read:**
```
contracts/phase2_payment_service_spec_v3.json
```

Read the ENTIRE contract file to understand:
- All 15 tasks (PA01-PA15)
- Acceptance criteria for each task
- Validation commands
- Evidence requirements
- Dependencies between tasks

---

## 📖 Step 2: Read AGENTS.MD

**File to read:**
```
AGENTS.MD
```

Understand:
- CDI workflow (7-step process)
- Zero deviation policy
- Pre-PR validation protocol
- Domain model (task marketplace)
- Service architecture (11 services)

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Read `contracts/phase2_payment_service_spec_v3.json` in full
- [ ] Read `AGENTS.MD` in full
- [ ] Understand CDI workflow: Read AGENTS.MD → Read Contract → Execute Task → Validate → Create Evidence → Check Regression → Report Complete
- [ ] Understand zero deviation policy (no contract modifications, no skipping criteria)
- [ ] Understand evidence requirements (`.automation/phase2/` location, JSON format)
- [ ] Identify blocking tasks in contract (PA04, PA08, PA09, PA14)
- [ ] Create evidence artifact for PA01

---

## 🔍 Validation Commands

Run these commands to validate your understanding:

```bash
# Verify contract exists and is valid JSON
cat contracts/phase2_payment_service_spec_v3.json | jq '.contract_meta.status'
# Expected output: "READY_FOR_EXECUTION"

# Verify AGENTS.MD exists
cat AGENTS.MD | head -n 5
# Expected output: Should show version 2.0.0

# Verify evidence directory exists (create if not)
mkdir -p .automation/phase2
ls -la .automation/phase2
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA01_discovery.json`

**Template:**

```json
{
  "task_id": "PA01",
  "win_code": "WA01",
  "title": "Discovery & Contract Validation",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T10:00:00Z",
  "completed_at": "2025-10-15T10:30:00Z",
  "duration_minutes": 30,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Read contract in full",
    "Read AGENTS.MD in full",
    "Understand CDI workflow",
    "Understand zero deviation policy",
    "Understand evidence requirements",
    "Identified blocking tasks (PA04, PA08, PA09, PA14)"
  ],
  "validation_outputs": {
    "contract_status_check": "READY_FOR_EXECUTION",
    "agents_md_version": "2.0.0",
    "evidence_directory_exists": true
  },
  "files_read": [
    "contracts/phase2_payment_service_spec_v3.json",
    "AGENTS.MD"
  ],
  "notes": "Phase 2 contract validated. Ready to proceed with PA02.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 30 minutes

If you exceed 30 minutes, stop and report:
- What you've completed
- What's blocking you
- Estimated time needed to complete

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] Contract read in full
- [ ] AGENTS.MD read in full
- [ ] Evidence artifact created at `.automation/phase2/PA01_discovery.json`
- [ ] All validation commands executed successfully
- [ ] You understand the CDI workflow
- [ ] You understand the zero deviation policy
- [ ] You've identified blocking tasks in the contract

---

## 🚀 Next Task

After completing PA01, proceed to **PA02** - Extend Payment Repository Schema.

**Note:** PA02 is NOT blocked. You can proceed immediately after completing PA01.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check `docs/PHASE2_EXECUTION_INSTRUCTIONS.md` for detailed guidance
2. Verify you have the latest version of all files
3. Report to PM with evidence artifact showing what you've completed

---

**End of PA01 Task Assignment**
