# Refactor Task 06: Extract OpenAI Provider

**Task ID**: REFACTOR-TASK-06
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-05
**Service**: llm-gateway-service
**Refactor Phase**: Phase 1
**Impact Level**: High

## PRE-EXECUTION VALIDATION
```bash
wc -l src/llm/providers/openai.ts && rg -n "class OpenAIProvider" src/llm/providers/openai.ts
```
**Expected**: ~287 LOC; provider class present

## Context
Move provider to gateway with unchanged behavior (default fetch).

## Implementation Steps
- Copy code into `services/llm-gateway/src/domain/providers/openai.ts`
- Adjust imports only

## POST-EXECUTION VALIDATION
```bash
rg -n "OpenAIProvider" services/llm-gateway && cd services/llm-gateway && npm test
```
**Expected**: Tests pass

## DoD
- [ ] Provider extracted
