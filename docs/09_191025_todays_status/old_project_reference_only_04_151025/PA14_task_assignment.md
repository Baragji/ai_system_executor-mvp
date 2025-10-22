# Task Assignment: PA14 - Full Validation Gate

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA14
**Duration:** 45 minutes
**Prerequisites:** PA13 complete

---

## 📋 Task Overview

Run the complete `npm run prepr:validate` pipeline to ensure all Phase 2 code is production-ready. This validation gate runs lint, typecheck, contract validation, integration tests, unit tests, service verification, and SBOM generation. Address any regressions and capture all outputs for evidence.

---

## 📁 Files to Create/Update

**Evidence files to create:**
```
.automation/phase2/PA14_prepr_validate_output.txt
.automation/phase2/PA14_validation_summary.json
```

**Reference files:**
```
AGENTS.MD (lines 23-42 - validation protocol)
package.json (line 38 - prepr:validate command)
```

---

## 🔧 Execution Required

### 1. Pre-Validation Checklist

Before running validation, ensure:

```bash
# 1. All changes committed
git status
# Expected: Clean working directory or only evidence files uncommitted

# 2. Node version correct
node --version
# Expected: v20.19.x

# 3. Dependencies installed
npm install
# Expected: No errors
```

### 2. Run Full Validation Pipeline

```bash
# Run the complete validation pipeline
npm run prepr:validate 2>&1 | tee .automation/phase2/PA14_prepr_validate_output.txt
```

**This command will:**
1. **Lint** (`npm run lint`) → Zero warnings
2. **Typecheck** (`npm run typecheck`) → No type errors
3. **Contract Check** (`npm run contract:check`) → Validates phase contracts
4. **Infrastructure Init** (`npm run dev:init`) → Initializes PostgreSQL, Redis, Prometheus
5. **Infrastructure Up** (`npm run dev:up`) → Starts all infrastructure
6. **Integration Tests** (`npm run test:integration`) → All tests pass
7. **Unit Tests** (`npm test`) → All tests pass, coverage ≥80%
8. **Service Verification** (`bash scripts/verify-all-services.sh`) → All health checks pass
9. **SBOM Generation** (`npm run sbom`) → Creates sbom.spdx.json
10. **Infrastructure Down** (`npm run dev:down`) → Stops all infrastructure

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] `npm run prepr:validate` exits with code 0 (success)
- [ ] Lint passes with zero warnings
- [ ] Typecheck passes with zero errors
- [ ] Contract validation passes for all phase contracts
- [ ] Infrastructure initializes successfully
- [ ] All integration tests pass (including PA13 payment lifecycle tests)
- [ ] All unit tests pass with ≥80% coverage
- [ ] All service health checks pass
- [ ] SBOM generated successfully
- [ ] Infrastructure tears down cleanly
- [ ] All outputs captured in evidence file
- [ ] Created validation summary JSON
- [ ] Created evidence artifact for PA14

---

## 🔍 Validation Commands

```bash
# 1. Check validation output file exists
ls -lh .automation/phase2/PA14_prepr_validate_output.txt
# Expected: File exists with content

# 2. Check for any failures in output
grep -i "fail\|error" .automation/phase2/PA14_prepr_validate_output.txt | grep -v "0 errors\|0 failed"
# Expected: No output (no failures)

# 3. Verify exit code was 0
echo $?
# Expected: 0 (after running npm run prepr:validate)

# 4. Check SBOM was generated
ls -lh sbom.spdx.json
# Expected: File exists

# 5. Verify services are stopped
lsof -i :3000-3009
# Expected: No output (all services stopped)
```

---

## 📦 Evidence Artifacts

### 1. Validation Output File

**File:** `.automation/phase2/PA14_prepr_validate_output.txt`

This file is automatically created by the `tee` command and contains the complete stdout/stderr from the validation run.

### 2. Validation Summary

**File:** `.automation/phase2/PA14_validation_summary.json`

**Template:**

```json
{
  "task_id": "PA14",
  "win_code": "WA14",
  "title": "Full Validation Gate",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T18:35:00Z",
  "completed_at": "2025-10-15T19:20:00Z",
  "duration_minutes": 45,
  "status": "COMPLETED",
  "validation_pipeline": {
    "command": "npm run prepr:validate",
    "exit_code": 0,
    "output_file": ".automation/phase2/PA14_prepr_validate_output.txt"
  },
  "validation_steps": {
    "lint": {
      "command": "npm run lint",
      "status": "PASS",
      "warnings": 0,
      "errors": 0
    },
    "typecheck": {
      "command": "npm run typecheck",
      "status": "PASS",
      "errors": 0
    },
    "contract_check": {
      "command": "npm run contract:check",
      "status": "PASS",
      "contracts_validated": ["phase2_payment_service_spec_v3"]
    },
    "dev_init": {
      "command": "npm run dev:init",
      "status": "PASS"
    },
    "dev_up": {
      "command": "npm run dev:up",
      "status": "PASS",
      "services_started": ["PostgreSQL", "Redis", "Prometheus"]
    },
    "integration_tests": {
      "command": "npm run test:integration",
      "status": "PASS",
      "tests_run": "X",
      "tests_passed": "X",
      "tests_failed": 0
    },
    "unit_tests": {
      "command": "npm test",
      "status": "PASS",
      "tests_run": "X",
      "tests_passed": "X",
      "tests_failed": 0,
      "coverage_line_pct": "85%",
      "coverage_branch_pct": "80%"
    },
    "service_verification": {
      "command": "bash scripts/verify-all-services.sh",
      "status": "PASS",
      "services_verified": 11
    },
    "sbom": {
      "command": "npm run sbom",
      "status": "PASS",
      "output_file": "sbom.spdx.json",
      "packages_included": "1035+"
    },
    "dev_down": {
      "command": "npm run dev:down",
      "status": "PASS"
    }
  },
  "acceptance_criteria_met": [
    "prepr:validate exits with code 0",
    "Lint passes with zero warnings",
    "Typecheck passes with zero errors",
    "Contract validation passes",
    "Infrastructure initializes",
    "Integration tests pass",
    "Unit tests pass with ≥80% coverage",
    "Service health checks pass",
    "SBOM generated",
    "Infrastructure tears down cleanly",
    "All outputs captured"
  ],
  "regression_check": {
    "status": "PASS",
    "notes": "All existing tests continue to pass. No regressions introduced by Phase 2 changes."
  },
  "notes": "Full validation pipeline passed. Phase 2 code is production-ready.",
  "issues_encountered": []
}
```

### 3. Task Evidence

**File:** `.automation/phase2/PA14_validation_gate.json`

```json
{
  "task_id": "PA14",
  "win_code": "WA14",
  "title": "Full Validation Gate",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T18:35:00Z",
  "completed_at": "2025-10-15T19:20:00Z",
  "duration_minutes": 45,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "npm run prepr:validate exits 0",
    "All validation steps passed",
    "Evidence captured in output file",
    "Validation summary created",
    "No regressions detected"
  ],
  "validation_outputs": {
    "prepr_validate_exit_code": 0,
    "output_file": ".automation/phase2/PA14_prepr_validate_output.txt",
    "summary_file": ".automation/phase2/PA14_validation_summary.json",
    "sbom_file": "sbom.spdx.json"
  },
  "files_created": [
    ".automation/phase2/PA14_prepr_validate_output.txt",
    ".automation/phase2/PA14_validation_summary.json",
    ".automation/phase2/PA14_validation_gate.json"
  ],
  "notes": "Complete validation gate passed. Phase 2 ready for PA15 evidence bundle.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 45 minutes

**Note:** The validation pipeline itself takes 10-15 minutes to run. The remaining time is for:
- Addressing any failures found
- Re-running validation after fixes
- Creating evidence artifacts

If validation fails:
1. **Stop immediately**
2. **Document the failure** in the evidence JSON
3. **Fix the root cause** (don't paper over it)
4. **Re-run validation** until it passes
5. **Report to PM** if fixes take longer than time box

---

## 💡 Implementation Tips

1. **Run in clean environment:** Ensure no background services running
2. **Save output:** The `tee` command saves output while showing it
3. **Watch for warnings:** Even if tests pass, warnings indicate issues
4. **Check coverage:** If coverage drops below 80%, add more tests
5. **Service verification:** If health checks fail, check service logs
6. **SBOM:** Verify the file is created and contains package info

---

## 🐛 Troubleshooting Common Issues

### Lint Failures

```bash
# Fix automatically
npm run lint:fix

# Check what changed
git diff
```

### Typecheck Failures

```bash
# Run typecheck alone to see errors
npm run typecheck

# Common issues:
# - Missing types for new fields
# - Incorrect type imports
# - Type mismatches in handlers
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run specific failing test
npm test -- path/to/failing.test.ts
```

### Infrastructure Issues

```bash
# Check if ports are already in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9090  # Prometheus

# Clean up and retry
npm run dev:down
pkill -f postgres
pkill -f redis
npm run dev:init
npm run dev:up
```

### Service Health Check Failures

```bash
# Check service logs
tail -f .data/logs/*.log

# Verify services are running
lsof -i :3000-3009

# Restart services
npm run services:down
npm run services:up
```

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] `npm run prepr:validate` executed successfully (exit code 0)
- [ ] All 10 validation steps passed
- [ ] Output captured in `.automation/phase2/PA14_prepr_validate_output.txt`
- [ ] Validation summary created at `.automation/phase2/PA14_validation_summary.json`
- [ ] SBOM generated at `sbom.spdx.json`
- [ ] No regressions detected in existing tests
- [ ] Evidence artifact created at `.automation/phase2/PA14_validation_gate.json`
- [ ] Infrastructure cleanly torn down (no orphan processes)

---

## 🚀 Next Task

After completing PA14, proceed to **PA15** - Phase 2 Completion Evidence Bundle.

**Note:** PA15 is the final task in Phase 2. It creates a comprehensive evidence package documenting all work completed.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check `AGENTS.MD` lines 23-42 for validation protocol
2. Review `package.json` line 38 for the exact command
3. Check `.data/logs/` for service error logs
4. Verify all PA01-PA13 tasks are complete
5. Report to PM with evidence artifact showing validation status

---

**End of PA14 Task Assignment**
