# Pause/Resume Telemetry Runbook

## Overview
The pause/resume pipeline now emits structured telemetry for every lifecycle transition. Operators can correlate API requests, worker acknowledgements, and frontend state using the event stream in `.telemetry/events.log` and `.automation/execution_trace.jsonl`.

## Event Reference
| Event Name | When Emitted | Key Payload Fields |
|------------|--------------|---------------------|
| `orchestrator.pause` | `status: "requested"` when the API accepts a pause request; `status: "acknowledged"` when workers surface a `PausedError`. | `sessionId`, `status`, `reason`, `stepId`, `stepType`, `sequence`, `manifestHash`, `checkpointAt`, `questions`, `durationMs`, `queueLatencyMs`, `provider`, `trigger`. |
| `orchestrator.abort` | Immediately after the API sets an abort signal. | `sessionId`, `active`, `reason`, `manifestHash`, `provider`, `trigger`. |
| `orchestrator.step` | After every step completes, fails, or pauses. | `sessionId`, `stepId`, `stepType`, `sequence`, `status`, `queueLatencyMs`, `runDurationMs`, `totalDurationMs`, `stop`, `manifestHash`, `provider`. |
| `orchestrator.resume` | After resume answers are persisted and before the workflow is re-enqueued. | `sessionId`, `checkpointAt`, `questionsResolved`, `manifestHash`, `adjustment`, `mode`, `provider`. |

All orchestrator events default `provider` to `process.env.LLM_PROVIDER` (or `openai` when unset) to keep telemetry consistent with the active LLM backend.

## SSE & Snapshot Metadata
Progress snapshots now include:

- `step`: `{ id, type, sequence, status?, startedAt?, completedAt?, durationMs?, queueLatencyMs? }`
- `manifestHash`: a 16-character digest of the captured workspace manifest

These appear in both the `/api/progress` SSE stream and `/api/progress/snapshot` responses, enabling clients to display the active step and confirm which manifest checkpoint applies. The public console surfaces the step label and manifest digest within the orchestration status banner and resume drawer.

## Troubleshooting Checklist
1. **Pause appears stuck at "requested"**
   - Confirm `orchestrator.pause` events progress from `status: "requested"` to `status: "acknowledged"`.
   - Inspect `orchestrator.step` for the latest step timings; long `runDurationMs` indicates the worker has not yielded yet.
2. **Resume never replays work**
   - Verify an `orchestrator.resume` event exists with the expected `mode` (`inline` vs `queue`).
   - Ensure the frontend displays the correct manifest digest; a mismatch suggests the checkpoint was not refreshed.
3. **Missing manifest hash**
   - Check `.automation/manifests/<session>.json` exists and contains a `digest`. The pause API logs a warning if capture fails.

## Operational Notes
- Telemetry helpers tolerate filesystem write failures and log warnings without interrupting the request lifecycle.
- Step events derive durations from checkpoint store timestamps; ensure system clocks are synchronized if discrepancies appear.
- The frontend status banner now concatenates checkpoint time, manifest hash, and step summary (e.g., `Checkpoint saved 10:24 • Manifest 1A2B3C4D • Step 3 · Single · #5F9A`).
