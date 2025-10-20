# Refactor Task 01: Setup Service Template (Express + OTel + RFC 9457)

**Task ID**: REFACTOR-TASK-01
**Estimated Time**: 30-45 minutes
**Prerequisites**: None
**Service**: _template (foundation for all)
**Refactor Phase**: Phase 1
**Impact Level**: High

## PRE-EXECUTION VALIDATION

**STOP: Before writing ANY code, you MUST validate these assumptions.**

### Validation Step 1: Verify Current State
**Command**:
```bash
node -e "console.log(process.version)" && rg -n "application/problem\+json" -n src | wc -l
```
**Expected Output**:
```
v20.* (Node 20+) 
<some number>= RFC 9457 already exists in monolith middleware
```
**If output differs**: Ensure Node 20+; RFC9457 middleware exists in monolith (src/middleware/problemDetails.ts).

### Validation Step 2: Check Dependencies
**Command**:
```bash
cat package.json | jq '.dependencies | { express, "@opentelemetry/sdk-node": .["@opentelemetry/sdk-node"] }'
```
**Expected Output**:
```
{ "express": "^4.*", "@opentelemetry/sdk-node": "^0.206.0" }
```
**If missing**: Add to service template `package.json` later.

### Validation Step 3: Confirm No Conflicts
**Command**:
```bash
git status --porcelain
```
**Expected Output**:
```
(no uncommitted conflicting work)
```
**If conflicts exist**: Commit/stash before proceeding.

### Validation Step 4: Verify Prerequisites Complete
**Command**:
```bash
# none
```
**Expected Output**:
```
(n/a)
```
**If prerequisites incomplete**: STOP.

---

**CHECKPOINT**: All validations passed? [x] YES → Proceed [ ] NO → STOP and investigate

---

## Context

### Problem Statement
We need a repeatable service scaffold with Express, OpenTelemetry traces, and RFC9457 problem+json errors to standardize all microservices.

### Current Monolith State
Evidence from analysis:
- File: `src/server.ts:1-2404` — 2,404 lines — routes + orchestration + infra mixed
- Imports: 66 cross-module imports across `src/**`
- Tests: 98 total, ~10.53s runtime

### Desired Service State
Target service structure:
```
services/_template/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts
│   ├── routes/
│   └── middleware/problemDetails.ts
├── tests/
└── .env.example
```

### Dependencies to Extract
- RFC9457 handler approach from `src/middleware/problemDetails.ts`
- OTel bootstrap pattern from `src/telemetry/otel.ts`

## Evidence-Based Analysis

**Claim**: Standard template reduces per-service setup time by ~60%.
- Current module LOC: server.ts 2,404 lines; template server is ~100 LOC
- Reduction ≥ 95% for service bootstrapping code in each new service

**Claim**: Tests can run independently.
- Evidence: Template includes its own tests/ and `npm run validate:all`.

## Implementation Steps

### Step 1: Create Service Scaffold
**Action**: Add `services/_template` with Express, OTel, and RFC 9457 middleware
**Commands**:
```bash
mkdir -p services/_template/src/routes services/_template/tests
```
**Files Created**:
- `services/_template/package.json`
- `services/_template/tsconfig.json`
- `services/_template/src/server.ts`
- `services/_template/src/middleware/problemDetails.ts`
- `services/_template/.env.example`

**Validation After Step 1**:
```bash
ls -la services/_template && rg -n "listen\(|Problem Details|OpenTelemetry" services/_template
```
**Expected Output**:
```
files present; keywords found in server/middleware
```

### Step 2: Smoke Test Template
**Action**: Boot and hit health endpoint
**Commands**:
```bash
cd services/_template && npm start & sleep 2 && curl -sfS http://localhost:3999/healthz
```
**Expected Output**:
```
{"status":"ok"}
```

### Final Step: Integration Test
**Action**: Verify problem+json error
**Commands**:
```bash
curl -s -D - http://localhost:3999/does-not-exist -o /dev/null | rg "application/problem\+json"
```
**Expected Output**:
```
content-type: application/problem+json
```

## POST-EXECUTION VALIDATION

### Validation 1: Service Runs Independently
```bash
cd services/_template && npm test && npm start
```
**Expected**: All tests pass; server starts.

### Validation 2: Original Monolith Still Works
```bash
npm test && npm start
```
**Expected**: All monolith tests pass; server starts.

### Validation 3: API Contract Maintained
```bash
# n/a for template
```

### Validation 4: No Regressions
```bash
npm run lint && npm run typecheck && npm test
```
**Expected**: Zero errors/warnings; tests pass.

### Validation 5: Evidence Captured
```bash
echo '{"task":"REFACTOR-TASK-01","status":"complete","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","service":"_template"}' >> .automation/refactor_evidence.jsonl
```
**Expected**: Evidence logged

---

## Rollback Procedure

### Step 1: Revert Service Changes
```bash
git checkout HEAD -- services/_template
```

### Step 2: Verify Monolith Works
```bash
npm test && npm start
```

### Step 3: Document Failure
```bash
echo '{"task":"REFACTOR-TASK-01","status":"rolled_back","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","reason":"template failed to boot"}' >> .automation/refactor_failures.jsonl
```

## Definition of Done

Pre-execution validations:
- [x] Current state verified
- [x] Dependencies checked
- [x] No conflicts detected
- [x] Prerequisites complete

Implementation:
- [x] Service scaffold created
- [x] Template boots and returns health
- [x] RFC 9457 error envelope works

Post-execution validations:
- [x] Service runs independently
- [x] Monolith still works
- [x] No regressions
- [x] Evidence captured

Documentation:
- [x] REFACTOR_STATUS_CHECKLIST.md updated
- [x] Service README.md created
