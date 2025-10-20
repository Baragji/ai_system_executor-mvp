# Refactor Task 04: Setup Dev Service Discovery (Ports + .env)

**Task ID**: REFACTOR-TASK-04
**Estimated Time**: 30-45 minutes
**Prerequisites**: REFACTOR-TASK-01
**Service**: all
**Refactor Phase**: Phase 1
**Impact Level**: Low

## PRE-EXECUTION VALIDATION
```bash
rg -n "PORT=" services | wc -l
```
**Expected**: 0 (before creation)

## Context
Define default ports for services and document them.

## Implementation Steps
- Add `.env.example` per service with PORT
- Document in README

## POST-EXECUTION VALIDATION
```bash
rg -n "PORT=" services/*/.env.example
```
**Expected**: entries for llm-gateway (3006), runner (3004), orchestrator (3005)

## Definition of Done
- [ ] Ports defined and documented
