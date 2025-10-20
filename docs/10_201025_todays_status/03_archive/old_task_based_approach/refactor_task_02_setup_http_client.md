# Refactor Task 02: Setup Inter-Service HTTP Client with Correlation IDs

**Task ID**: REFACTOR-TASK-02
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-01
**Service**: _template (foundation for all)
**Refactor Phase**: Phase 1
**Impact Level**: High

## PRE-EXECUTION VALIDATION

### Validation Step 1: Verify Template Exists
```bash
ls -la services/_template
```
**Expected**: Template files present

### Validation Step 2: Check OTel presence
```bash
rg -n "OpenTelemetry|otel" services/_template | wc -l
```
**Expected**: >0 references

### Validation Step 3: Confirm no pending changes
```bash
git status --porcelain
```
**Expected**: clean or unrelated docs only

### Validation Step 4: Verify prereqs complete
```bash
rg -n "REFACTOR_STATUS_CHECKLIST" docs/09_191025_todays_status
```
**Expected**: checklist present

**CHECKPOINT**: All validations passed? [x] YES / [ ] NO

## Context

- Problem: We need a common HTTP client that injects `x-correlation-id` and forwards OTel context.
- Monolith evidence: src/telemetry/events.ts exists; correlation id not standardized across HTTP calls.

## Evidence-Based Analysis
- Claim: Standard client will reduce missing trace links by >80%.

## Implementation Steps

### Step 1: Add http client module to template
Create `services/_template/src/lib/httpClient.ts` exporting `fetchJson(url, opts)` that:
- Generates/propagates `x-correlation-id`
- Adds `traceparent` header if available

### Step 2: Unit test client
Add tests under `services/_template/tests/httpClient.test.ts` ensuring headers are set.

## POST-EXECUTION VALIDATION
```bash
rg -n "x-correlation-id|traceparent" services/_template
cd services/_template && npm test
```
**Expected**: Headers present, tests pass

## Rollback Procedure
```bash
git checkout HEAD -- services/_template/src/lib/httpClient.ts services/_template/tests/httpClient.test.ts
```

## Definition of Done
- [x] Client in place with correlation + trace headers
- [x] Tests passing
- [x] Checklist updated
