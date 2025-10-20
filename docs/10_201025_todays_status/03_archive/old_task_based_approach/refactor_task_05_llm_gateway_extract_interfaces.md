# Refactor Task 05: Extract LLM Provider Interfaces

**Task ID**: REFACTOR-TASK-05
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-01..04
**Service**: llm-gateway-service
**Refactor Phase**: Phase 1
**Impact Level**: High

## PRE-EXECUTION VALIDATION
```bash
rg -n "export async function generateJSON" src/llm/index.ts
wc -l src/llm/index.ts
```
**Expected**: Function present; ~333 LOC (baseline)

## Context
Extract `generateJSON` interface and tool schema mapping to a dedicated gateway.

## Implementation Steps
- Create `services/llm-gateway/src/domain/index.ts` with interface and driver
- Export POST /complete to call driver

## POST-EXECUTION VALIDATION
```bash
rg -n "POST /complete" services/llm-gateway && cd services/llm-gateway && npm test
```
**Expected**: Endpoint present, tests pass

## DoD
- [ ] Interfaces extracted; monolith references updated later
