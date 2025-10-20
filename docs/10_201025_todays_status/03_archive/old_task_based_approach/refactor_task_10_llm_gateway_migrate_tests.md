# Refactor Task 10: Migrate LLM Tests to Gateway

**Task ID**: REFACTOR-TASK-10
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-09
**Service**: llm-gateway-service
**Refactor Phase**: Phase 1
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION
```bash
rg -n "OpenAIProvider" tests | wc -l
```
**Expected**: >0

## Implementation Steps
- Move provider tests into `services/llm-gateway/tests`
- Keep monolith integration tests

## POST-EXECUTION VALIDATION
```bash
cd services/llm-gateway && npm test && cd ../../ && npm test
```
**Expected**: both pass

## DoD
- [ ] Tests migrated
