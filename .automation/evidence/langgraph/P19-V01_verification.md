# P19-V01 – Executions store and StepQueue parity verification

## API polling endpoint
- Confirmed `/api/executions/:id` still delegates to `getExecution` and only responds with RFC 9457 problem details when a record is missing; success path continues to return the raw execution record. 【F:src/server.ts†L433-L441】

## StepQueue deterministic safeguards
- Workflow plan initialization clones payloads before persistence so resumes rehydrate identical descriptors, and resume mode replays completed steps while preserving stop semantics. 【F:src/orchestrator/stepQueue.ts†L121-L205】
- Enqueueing a step clones payloads, records queueing metadata, and the handler retries `recordStepRunning`/`recordStepCompletion` on race conditions, keeping workflow state deterministic. 【F:src/orchestrator/stepQueue.ts†L207-L352】

## Validation
- `npm test -- tests/api/executions.test.ts` 【97e479†L1-L34】
  - Passes targeted executions suite with LangGraph flag enabled and coverage thresholds suppressed for focused run per Vitest config.
