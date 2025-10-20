# Refactor Task 19: Per-Service CI/QA Validation

**Task ID**: REFACTOR-TASK-19
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-12..18
**Service**: orchestrator, runner
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION

```bash
ls -la services/orchestrator services/runner | cat
```

## Context
Run `validate:all` in both orchestrator and runner services, and capture evidence (lint/type/tests all green).

## Implementation Steps

1) Validate orchestrator
```bash
cd services/orchestrator && npm run validate:all
```

2) Validate runner
```bash
cd services/runner && npm run validate:all
```

3) Capture evidence
```bash
echo '{"task":"REFACTOR-TASK-19","service":"orchestrator","status":"complete","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> .automation/refactor_evidence.jsonl
echo '{"task":"REFACTOR-TASK-19","service":"runner","status":"complete","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> .automation/refactor_evidence.jsonl
```

## POST-EXECUTION VALIDATION

```bash
tail -n 5 .automation/refactor_evidence.jsonl
```

## Rollback Procedure

```bash
sed -i '' '/REFACTOR-TASK-19/d' .automation/refactor_evidence.jsonl || true
```

## Definition of Done
- [ ] Both services pass validate:all
- [ ] Evidence recorded
