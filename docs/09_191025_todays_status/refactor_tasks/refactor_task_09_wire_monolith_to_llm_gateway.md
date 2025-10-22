# Refactor Task 09: Wire Monolith to LLM Gateway

**Task ID**: REFACTOR-TASK-09
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-08
**Service**: monolith → llm-gateway-service
**Refactor Phase**: Phase 1
**Impact Level**: High

## PRE-EXECUTION VALIDATION
```bash
rg -n "chat\.completions|OpenAI\(" src | wc -l
```
**Expected**: >0 (before)

## Implementation Steps
- Replace direct SDK calls with HTTP to gateway

## POST-EXECUTION VALIDATION
```bash
rg -n "http://localhost:3006/complete" src && npm test
```
**Expected**: references present; tests pass

## DoD
- [ ] Monolith uses gateway
