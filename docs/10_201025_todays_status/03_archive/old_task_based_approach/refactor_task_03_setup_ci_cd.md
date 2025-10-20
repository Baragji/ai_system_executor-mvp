# Refactor Task 03: Setup Per-Service CI/CD (Local Validation Script)

**Task ID**: REFACTOR-TASK-03
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-01
**Service**: _template
**Refactor Phase**: Phase 1
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION
```bash
ls -la services/_template
```
**Expected**: template exists

## Context
Add `npm run validate:all` (lint+type+test) to each service.

## Implementation Steps
- Add scripts to `services/_template/package.json`: validate:all, lint, typecheck, test

## POST-EXECUTION VALIDATION
```bash
cd services/_template && npm run validate:all
```
**Expected**: Exit 0

## Rollback Procedure
```bash
git checkout HEAD -- services/_template/package.json
```

## Definition of Done
- [ ] validate:all script exists and passes
