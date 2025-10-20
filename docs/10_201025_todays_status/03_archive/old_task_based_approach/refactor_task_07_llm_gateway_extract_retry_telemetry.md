# Refactor Task 07: Extract Retry Logic and Telemetry

**Task ID**: REFACTOR-TASK-07
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-06
**Service**: llm-gateway-service
**Refactor Phase**: Phase 1
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION
```bash
rg -n "llm_retry|llm_provider_" src/llm src/telemetry
```
**Expected**: Events present in monolith

## Context
Centralize retry and telemetry in gateway.

## Implementation Steps
- Move retry configuration vars
- Emit telemetry from gateway endpoints

## POST-EXECUTION VALIDATION
```bash
rg -n "llm_retry|llm_provider_" services/llm-gateway
```
**Expected**: Events present in gateway

## DoD
- [ ] Retry + telemetry extracted
