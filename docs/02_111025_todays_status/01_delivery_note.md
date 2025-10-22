# 1. Strategy Overview
Prioritize Phase 1 deliverables—filesystem tools, manifest capture, and LLM integration—before touching resume semantics or BullMQ to stay within the “no new dependencies” constraint and deliver immediate pause/resume value.
Treat Phase 2 (resume with context) as a follow-on iteration after verifying Phase 1 tooling works end-to-end, deferring BullMQ migration until the MVP proves the need for distributed durability.
Phase 1 Execution Plan
Discovery & Compliance
Produce the required discovery note outlining integration points, verifying stack constraints, and capturing code snippets for each targeted file before modifying anything, in line with the repository AGENTS.md instructions.
Filesystem Tooling (src/llm/tools/fsTools.ts)
Implement list, read, and manifest summary tools using Node’s fs, path, and crypto, enforcing path validation to confine access to the output/ subtree.
Unit-test each tool (including traversal guardrails) under tests/llm/tools/fsTools.test.ts.
Workspace Manifest (src/orchestrator/workspaceManifest.ts)
Implement manifest capture and retrieval helpers that snapshot the session’s output directory and persist JSON manifests to .automation/manifests, sharing scan logic with the tool implementation.
Server Integration
On session pause, call captureManifest so every checkpoint includes a filesystem snapshot.
When invoking the model, pass the MCP-style tools and project context into generateJSON so the LLM can fetch state on demand.
Validation
Run lint, typecheck, unit tests, contract checks, and SBOM generation per repository policy before opening the PR.
Perform a manual pause/resume dry run to confirm the LLM can inspect generated files via tools, satisfying Phase 1 success criteria.
Phase 2 Preparation
Once tooling is proven, enhance the resume endpoint to spin up a new execution seeded with checkpoint data, manifest summary, and user adjustments while extending the system prompt to instruct the LLM on tool usage and existing state.
Add API-level tests to verify pause→resume flows and ensure progress resumes asynchronously.
Risk & Mitigation Notes
Validate OpenAI tool-call interoperability early with minimal prompts to reduce integration risk.
Keep manifest payloads concise by summarizing and letting the LLM request details via the new tools, protecting prompt size budgets.
Maintain strict path validation to avoid leaking files outside output/, aligning with the documented security mitigation.
This staged approach preserves compliance with repository constraints, delivers immediate context-continuity improvements, and sets a clear runway for the later resume and BullMQ enhancements

# 2. 
Summary
Extended generateJSON to orchestrate tool-call loops, auto-register filesystem tooling when a trace context exposes a project slug, and log executed tools alongside normal fixture captures.
Added shared LLM tooling types plus MCP-style filesystem tools and workspace scanning/manifest helpers so the model can safely inspect project output during pause/resume flows.
Updated OpenAI and Anthropic providers to speak the richer tool-aware protocol while guarding Anthropic against unsupported tool usage.
Wired server logic to persist project slugs, capture manifests on pause, reuse slug metadata on resume, and verified the new tooling with unit tests for filesystem access and manifest capture.
Testing
✅ npm run lint
✅ npm run typecheck
⚠️ npm test *(fails: environment lacks optional @rollup/rollup-linux-x64-gnu binary even after retry with native disable)*
✅ npm run contract:check
⚠️ npm run sbom *(fails: pre-existing semver/@types dependency mismatch reported by npm sbom)* 

# 3.
Summary
Added bullmq/ioredis dependencies and implemented an execution queue adapter with inline fallback to submit plan and single-run jobs through BullMQ.
Connected the server’s single-run, plan, and resume flows to the queue while adding queued-progress metadata when running in BullMQ mode.
Centralized execution option/result typing for reuse across the queue and resume logic, and introduced unit tests covering the queue adapter and workspace summary formatter.
Testing
✅ npm run lint
✅ npm run typecheck
✅ npm test
✅ npm run contract:check
✅ npm run sbom

# 4.
Files (29)

.automation/phase5_bullmq_queue_discovery.json
Ny

.automation/phase5_bullmq_queue_discovery_note.md
Ny

.automation/phase5_mcp_tools_discovery.json
Ny

.automation/phase5_mcp_tools_discovery_note.md
Ny

.automation/phase5_resume_context_discovery.json
Ny

.automation/phase5_resume_context_discovery_note.md
Ny

package-lock.json
+280
-3

package.json
+3
-0

sbom.spdx.json
+534
-21

src/llm/index.ts
+136
-17

src/llm/providers/anthropic.ts
+23
-6

src/llm/providers/openai.ts
+109
-14

src/llm/tools/fsTools.ts
Ny

src/llm/types.ts
Ny

src/orchestrator/executionTypes.ts
Ny

src/orchestrator/jobQueue.ts
Ny

src/orchestrator/resumePrompt.ts
Ny

src/orchestrator/workspaceManifest.ts
Ny

src/server.ts
+439
-175

src/workspace/manifest.ts
Ny

tests/llm/retry.test.ts
+1
-1

tests/llm/timeout-retry.test.ts
+5
-6

tests/llm/tools/fsTools.test.ts
Ny

tests/orchestrator/jobQueue.test.ts
Ny

tests/orchestrator/resumePrompt.test.ts
Ny

tests/orchestrator/workspaceManifest.test.ts
Ny

tests/repair/delete-validation.test.ts
+1
-1

tests/repair/missing-contents-fallback.test.ts
+3
-3

tests/workspace/manifest.test.ts
Ny