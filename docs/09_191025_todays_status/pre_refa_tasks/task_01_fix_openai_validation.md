# Task 01: Fix OpenAI Response Validation (Blocking)

**Task ID**: TASK-01  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: None  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
OpenAI responses intermittently returned empty strings when using a curl-based fetch shim, causing `invalid_response_shape` and `EMPTY_MESSAGE` errors. We must ensure the provider reliably parses GPT-5 responses and that fallback paths do not throw TypeErrors.

### Phase 21 Requirement
- Gate G3.1 requires a stable runtime with real LLM e2e. Provider instability blocks e2e evidence capture.

### Current State
- File: `src/llm/providers/openai.ts:151` - Chat completions call and validation
- File: `src/llm/providers/openai.ts:171` - Empty message telemetry + request context
- File: `src/llm/providers/openai.ts:193` - Responses API fallback (strict guards)
- File: `.telemetry/events.log` - Contains historical invalid_response_shape entries

### Desired State
- Default SDK fetch (no curl shim) with successful content extraction
- No `invalid_response_shape` or `EMPTY_MESSAGE` errors during normal runs
- Evidence of successful /api/execute request

---

## Acceptance Criteria

**Must Have**:
- [ ] Provider uses SDK default fetch and returns non-empty content for GPT-5
- [ ] Fallback path does not throw TypeErrors when the response is primitive or null
- [ ] `events.log` shows no invalid_response_shape for the successful run

**Must Not Have**:
- [ ] No use of `in` operator on non-objects in provider fallback

**Contract Compliance**:
- [ ] Satisfies Phase 21 stabilization precondition for e2e evidence
- [ ] Preserves API parity
- [ ] Preserves feature flag behavior

---

## Implementation Guidance

### Files to Modify
1. `src/llm/providers/openai.ts` - Ensure default fetch; robust fallback guards

### Code Locations
- `src/llm/providers/openai.ts:151` - chat.completions call
- `src/llm/providers/openai.ts:171` - empty message logging
- `src/llm/providers/openai.ts:193` - responses.create fallback

### Implementation Steps

**Step 1: Remove curl shim**
- Use SDK default fetch; ensure response bodies are not empty

**Step 2: Guard fallback**
- Extract `output_text` or first content block only with `typeof === 'object'` checks

**Step 3: Validate**
- Run local request and check telemetry

---

## Validation

### Commands
```bash
# Start server
npm start &
sleep 5

# Make a request
curl -sS -X POST http://localhost:3000/api/execute \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello world","context":{}}'

# Verify no shape errors for this run
tail -n 200 .telemetry/events.log | rg -n "invalid_response_shape|EMPTY_MESSAGE" || echo "no shape errors"
```

**Expected Output**:
- HTTP 200 with executor response
- No matching telemetry entries for invalid_response_shape or EMPTY_MESSAGE in the tail

### Evidence Capture
```bash
# Trace tail
tail -n 200 .automation/execution_trace.jsonl | rg -n "langgraph\.started|langgraph\.completed|llm_retry"
```

---

## Contract Compliance

### Phase 21 Requirements Satisfied
- Gate G3.1 readiness: stable provider for e2e evidence

### CDI Approval Criteria Met
- [ ] Acceptance criteria pass
- [ ] Tests pass
- [ ] Evidence captured

### Gate G3.1 Progress
This task unblocks e2e evidence capture required for Gate G3.1.

---

## Rollback Plan
```bash
git checkout HEAD -- src/llm/providers/openai.ts
npm test
```

---

## Definition of Done
- [ ] Provider stable for GPT-5
- [ ] Fallback path robust
- [ ] Evidence captured
- [ ] No regression in tests

