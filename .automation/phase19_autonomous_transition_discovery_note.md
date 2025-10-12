# Phase 19 — Discovery Note: Transition to Autonomous AI-Driven Coding System (TypeScript-Only)

Last Updated: 2025-10-12
Scope: System-wide (backend `src/*`, frontend `/public`, CDI infra)

This note documents exact integration points, current implementations with code snippets, dependencies, impacts, and stack compliance per ai-stack.json.

---

## Integration Points (file + line + function)

- Orchestration entry (execution request)
  - File: `src/server.ts:1508`
  - Symbol: `app.post("/api/execute", …)`
  - Why: Central pipeline where we can switch orchestrators under a feature flag (keep `StepQueue` as default; optionally route to LangGraph runtime).

- Progress streaming (SSE)
  - File: `src/server.ts:2173`
  - Symbol: `app.get("/api/progress/stream/:sessionId", …)`
  - Why: Existing SSE used for progress; extend to stream planner/implementer/tester/critic events and HITL interruptions.

- LLM call boundary (instrumentation + tool calls)
  - File: `src/llm/index.ts:88`
  - Symbol: `export async function generateJSON(…)`
  - Why: Primary LLM invocation; add GenAI OTel spans, Langfuse traces (non-breaking), and MCP tool context later.

- Planner bridge
  - File: `src/planning/decomposeTask.ts:195`
  - Symbol: `export async function decomposeTask(…)`
  - Why: Use as the Planner agent node (graph step) without changing its contract.

- Implementer validation
  - File: `src/contracts/validators.ts:86`
  - Symbol: `export function validateExecutorOutput(…)`
  - Why: Enforce schema at implementer step; keep as-is but emit spans/metrics around it.

- Tester bridge
  - File: `src/runner/runInSandbox.ts:78`
  - Symbol: `export async function runInSandbox(…)`
  - Why: Use as Tester agent node; surface pass/fail metrics and logs to traces.

- Abort/pause control
  - File: `src/orchestrator/abortSignal.ts:1`
  - Symbol: `PausedError`, `createAbortSignal`, `throwIfAborted`
  - Why: Map to HITL pause/resume gates inside the graph.

- Telemetry event log (action/trace file)
  - File: `src/telemetry/events.ts:70`
  - Symbol: `export async function logEvent(…)`
  - Why: Extend to dual-write JSONL action logs (feature-flagged) for SIEM.

---

## Current Implementation Snippets (±10 lines)

- Orchestration entry
  - `src/server.ts:1508`
  ```ts
  app.post("/api/execute", async (req, res) => {
    const providedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const sessionId = providedSessionId || randomUUID();
    const wantsSse = typeof req.headers.accept === "string" && req.headers.accept.includes("text/event-stream");
    let sseStarted = false;
    res.setHeader("x-executor-session", sessionId);
    // … StepQueue workflow is assembled later in this handler …
  });
  ```

- LLM call boundary
  - `src/llm/index.ts:88`
  ```ts
  export async function generateJSON(messages: LLMMessage[], options: GenerateJSONOptions = {}): Promise<string> {
    const provider = chooseProvider();
    const maxRetries = Number(process.env.LLM_MAX_RETRIES ?? 3);
    const initialBackoff = Number(process.env.LLM_INITIAL_BACKOFF_MS ?? 1000);
    const maxBackoff = Number(process.env.LLM_MAX_BACKOFF_MS ?? 10000);
    const callTimeout = Number(process.env.LLM_CALL_TIMEOUT_MS ?? 60000);
    // … tool loop + retry logic …
  }
  ```

- Planner bridge
  - `src/planning/decomposeTask.ts:195`
  ```ts
  export async function decomposeTask(prompt: string, clarifications?: ClarificationResponse): Promise<TaskPlan> {
    if (needsClarification(prompt, clarifications)) {
      throw new ClarificationRequiredError("Prompt is ambiguous. Collect clarifications before decomposing.");
    }
    // … requestPlan via generateJSON, validateTaskPlan …
  }
  ```

- Tester bridge
  - `src/runner/runInSandbox.ts:78`
  ```ts
  export async function runInSandbox(options: RunInSandboxOptions): Promise<RunResult> {
    // installs (if needed), runs tests with timeout, collects logs,
    // parses pass/fail counts, validates run result schema, logs evaluation
  }
  ```

---

## Dependencies & Potential Impacts

- New optional libraries (justification provided; no immediate changes made):
  - Orchestrator: `@langchain/langgraph` (feature-flagged runtime; parity with StepQueue maintained)
  - Observability: `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/instrumentation-openai` (GenAI semconv)
  - Tracing UI: `@langfuse/node` (optional; spans already useful standalone)
  - MCP (later): `@modelcontextprotocol/sdk` (tools interop; scaffold only)
  - SBOM (optional add): `@cyclonedx/cyclonedx-npm` (CycloneDX 1.6 alongside existing SPDX)

- Runtime/behavioral impact
  - None until feature flags enabled. Default remains current `StepQueue` pipeline and APIs.
  - SSE already present; we will re-use for HITL gates without breaking endpoints.

- Test impact
  - Add unit tests for any new graph nodes and telemetry bootstrap; coverage thresholds unchanged (>=80% lines/75% branches).

---

## Stack Compliance Check (ai-stack.json)

- Language: TypeScript-only — compliant.
- Backend: Node 20+ with Express — current server `src/server.ts` is Express-based — compliant.
- Frontend: `/public` vanilla JS/CSS only — compliant; proposed chat UI would live under `/public` — compliant.
- Testing: Vitest with thresholds enforced — compliant; no changes planned to framework.
- Linting: ESLint zero warnings — compliant; new code must adhere.
- Forbidden: No Python files — compliant (note: `src/clarification/generateQuestions.ts` includes Python framework names in options; content-only, but flagged as drift risk for prompts).
- No new dependencies without justification — any additions above are strictly justified and feature-flagged.
- No breaking API changes — proposed design preserves current endpoints and schemas.

---

## Proposed Approach (Summary)

- Short term (Trust Spine): add OTel GenAI spans, RFC 9457 problem details responses, optional CycloneDX; no API changes.
- Orchestration: keep `StepQueue` as default; introduce LangGraph.js runtime behind `AGENTS_RUNTIME=langgraph` env for a single flow (clarify→plan→generate→test→repair). Roll out gradually.
- HITL: reuse existing SSE; add simple `/public` chat for clarify/pause/resume; map to `abortSignal` and interrupts.
- Tools: MCP server scaffold for safe FS/Git/HTTP tools with policy file (no default enablement).

---

## Evidence Inputs Used

- Claude Final Research (TypeScript viability and ecosystem)
  - `docs/Goal_&_Vision_inspirational_only/03_final_decisions/01a_final_research_Claude.md:1`
- GPT_RA Final Research (repo-aware phased plan)
  - `docs/Goal_&_Vision_inspirational_only/03_final_decisions/01b_final_research_GPT_RA.md:1`
- GPT_HIGH Final Research (trust spine, non-breaking upgrades)
  - `docs/Goal_&_Vision_inspirational_only/03_final_decisions/01c_final_research_GPT_HIGH.md:1`
- CDI Infrastructure (CDI gates, SBOM, contracts)
  - `CDI_INFRASTRUCTURE.md:1`

---

## Risks & Mitigations (Top)

- Orchestrator adoption risk (learning curve): keep StepQueue runtime default; limit blast radius via feature flag and parity tests.
- Compliance drift (Python hints in clarify templates): remove/replace Python options in UI prompts before enabling autonomous mode; enforce through tests.
- Telemetry overhead: enable OTel via env flags; export to console/OTLP only in non-prod until tuned.
- Tooling sprawl: prefer MCP policy with allow-lists; start with read‑only FS/Git; progressive enablement.

---

## Acceptance Gates (No code changes yet)

- All validation commands pass unchanged:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run contract:check`
  - `npm run sbom`

This discovery note is preparatory; implementation will follow CDI pattern with per-session discovery updates.

