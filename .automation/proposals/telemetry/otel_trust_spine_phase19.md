# Phase 19 — OTel Trust-Spine Enablement (Proposal)

## Summary
- **Objective:** Justify and stage OpenTelemetry runtime dependencies so LangGraph/LLM spans can export traces when `OTEL_ENABLED=1`.
- **Scope:** Telemetry bootstrap in `src/telemetry/otel.ts`, span helpers in `src/telemetry/llmSpans.ts`, and LLM boundary instrumentation at `src/llm/index.ts:generateJSON`.
- **Default Behavior:** No telemetry activation unless the environment flag is set _and_ optional OTel packages are installed. Current implementation degrades gracefully when packages are absent.

## Proposed Dependencies
| Package | Reason | Notes |
|---------|--------|-------|
| `@opentelemetry/api` | Span interface + context | Required at runtime; currently imported dynamically and shimmed via `src/types/opentelemetry-api.d.ts` |
| `@opentelemetry/sdk-node` | Node SDK for automatic resource detection & OTLP wiring | Install as prod dependency when we move beyond placeholder bootstrap |
| `@opentelemetry/exporter-trace-otlp-http` | OTLP trace exporter | Allows forwarding spans to Langfuse/collector |

_All packages obey ai-stack.json (Node 20, TS). They are optional until CODEOWNERS approval._

## Integration Points
1. **Bootstrap:** `src/telemetry/otel.ts` exports `isTelemetryEnabled()` and `maybeInitTelemetry()`; both remain no-ops without env flag.
2. **Span Helper:** `src/telemetry/llmSpans.ts` dynamically imports `@opentelemetry/api`, sanitizes attributes, and exposes `startLlmSpan()` returning a no-op span when telemetry is off.
3. **LLM Boundary:** `src/llm/index.ts` wraps `generateJSON` calls in a span, adding events for retries/tool calls and tagging final status (`success`, `paused`, `error`).
4. **Adapter Stub:** `src/orchestrator/graph.ts` + `src/orchestrator/adapter.ts` remain feature-flagged; spans will correlate with future LangGraph transitions.

## Activation Checklist
- [ ] Add dependencies above with CODEOWNERS approval.
- [ ] Update `maybeInitTelemetry()` to instantiate `NodeSDK` with OTLP exporter (respecting env config already in place).
- [ ] Provide `.env.example` guidance for `OTEL_EXPORTER_OTLP_ENDPOINT` and optional headers.
- [ ] Capture evidence in `.automation/` (e.g., sample JSONL of spans) when flag is enabled.

## Risk & Mitigation
- **Missing packages:** Guarded by dynamic imports + shims; no runtime crash.
- **Attribute leakage:** Sanitization coerces values to strings/booleans/numbers before writing to spans.
- **Paused executions:** Marked as `llm.result.status=paused` without flagging error status, preserving contract semantics.

## Next Steps
- Seek approval to add dependencies + CI pinning (CycloneDX output already handled via `npm run sbom`).
- Extend span coverage to planner/tester agents once LangGraph runtime lands.
- Evaluate Langfuse integration once OTLP exporter is verified.
