# Phase 5 MCP Tools — Discovery

Date: 2025-10-11
Scope: Deliver Phase 1 of MCP tooling — filesystem tool exposure, manifest capture, and server integration for pause/resume continuity.

## Integration Points & Current State

- **LLM wrapper** — `src/llm/index.ts` (`generateJSON`)
  ```ts
  export async function generateJSON(messages: LLMMessage[]): Promise<string> {
    const provider = chooseProvider();
    const maxRetries = Number(process.env.LLM_MAX_RETRIES ?? 3);
    const initialBackoff = Number(process.env.LLM_INITIAL_BACKOFF_MS ?? 1000);
    const maxBackoff = Number(process.env.LLM_MAX_BACKOFF_MS ?? 10000);
    const callTimeout = Number(process.env.LLM_CALL_TIMEOUT_MS ?? 60000);
  ```
  *All LLM traffic flows through here. We will extend the signature to accept optional tool context, orchestrate tool-call loops, and automatically register filesystem tools when a trace context exposes `projectSlug`.*

- **OpenAI client** — `src/llm/providers/openai.ts`
  ```ts
  async generate(messages: LLMMessage[]): Promise<string> {
    // Reasoning models (o1, o1-mini, o1-preview, gpt-5) don't support custom temperature
    const isReasoningModel = this.model.startsWith('o1') || this.model.startsWith('gpt-5');

    const requestParams: OpenAI.ChatCompletionCreateParams = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      response_format: { type: "json_object" }
    };
  ```
  *Needs provider-level tool schema wiring, ability to surface tool calls, and signal propagation.*

- **Anthropic client** — `src/llm/providers/anthropic.ts`
  ```ts
  async generate(messages: LLMMessage[]): Promise<string> {
    const system = messages.find(m => m.role === "system")?.content || "";
    const user = messages.filter(m => m.role === "user").map(m => ({ role: "user" as const, content: m.content }));
    const resp = await this.client.messages.create({
      model: this.model,
      system,
      max_tokens: 4096,
      temperature: 0.2,
      messages: user
    });
  ```
  *Currently unaware of tool calls; we will guard against unsupported tooling so Phase 1 remains OpenAI-first without breaking Anthropic.*

- **Pause endpoint** — `src/server.ts`
  ```ts
  app.post("/api/sessions/:id/pause", async (req, res) => {
    …
    const checkpoint = await raiseInterrupt({
      sessionId,
      machine: session.machine,
      reason,
      questions,
      machineContext,
      checkpointPayload
    });

    session.paused = true;
    session.questions = checkpoint.payload?.pendingQuestions ?? [];
  ```
  *After checkpoint creation we will capture a workspace manifest so resumes can hydrate context.*

## Planned Additions
- New MCP-style filesystem toolkit at `src/llm/tools/fsTools.ts` (list, read, manifest summary) with strict path validation bound to `output/<slug>`.
- Shared workspace scanner utility (`src/workspace/manifest.ts`) consumed by tools and orchestrator manifest capture.
- Orchestrator manifest helper (`src/orchestrator/workspaceManifest.ts`) plus server wiring during pauses.
- Unit tests for tool behaviors and manifest capture under `tests/llm/tools` and `tests/orchestrator`.

## Dependencies & Compliance
- **Stack check**: `ai-stack.json` already lists Node 20 + TypeScript. All new functionality uses built-in `fs`, `path`, and `crypto`; no new packages.
- **Security**: Path resolution will harden against `..` escapes to comply with AGENTS.md guardrails.
- **Contracts/tests**: Existing API responses remain unchanged; we will update/extend tests to maintain coverage ≥80% lines.

## Risks & Mitigations
- **Tool-call loops**: limit iterations and surface clear errors on unknown tools or malformed args to prevent infinite retries.
- **Provider drift**: keep Anthropic path tool-free, defaulting to manifest read support only when provider supports it (OpenAI today).
- **Filesystem race**: gracefully handle missing output directories during early execution.

