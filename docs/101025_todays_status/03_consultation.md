## user:
---

**Critical System Architecture Gap - We're Symptom Fighting, Not Solving**

I'm observing a fundamental flaw in our system architecture that everyone keeps calling "production grade," but it's nowhere near that standard.

**The Problem:**

**OpenAI's Codex (o3) behavior when it hits a wall:**
- Gracefully pauses execution
- Explains WHY it stopped (e.g., "ambiguous requirement," "missing dependency," "needs clarification")
- Waits for user consultation
- Resumes EXACTLY where it left off after user provides input

**Our system's behavior when hitting the same wall:**
- User submits prompt
- User presses "Execute"
- User waits (no interaction possible)
- System either:
  - Completes (burns tokens on potentially wrong assumptions), OR
  - Fails (burns tokens, produces nothing, forces complete restart)

**The Core Issue:**

We have NO mid-execution pause/resume capability. Our system is fire-and-forget, which means:
- We can't ask clarifying questions mid-execution
- We can't pause when ambiguity is detected
- We can't let the user course-correct before wasting tokens
- Every failure requires starting from scratch (resetting context, re-burning tokens)

**What I'm Seeing:**

We're **symptom fighting** with UI fixes (Phase A-FIX) when the real problem is **architectural**:
- Better error cards don't fix the lack of pause/resume
- Pretty loading states don't fix token waste on wrong assumptions
- Debug disclosures don't fix inability to intervene mid-execution

**What We Actually Need:**

A system that can:
1. **Pause execution** when it detects ambiguity or blockers
2. **Preserve execution state** (context, progress, generated artifacts)
3. **Ask targeted questions** to the user
4. **Resume from the exact pause point** after getting answers
5. **Avoid token waste** by not proceeding with wrong assumptions

**This Is Not A UI Problem - It's An Orchestration Problem**

The current contract-execution model assumes:
- Perfect input (no ambiguity)
- Linear execution (no pauses)
- Complete autonomy (no mid-flight user input)

But real-world app generation requires:
- Handling ambiguous requirements
- Pausing for critical decisions
- Incorporating user feedback mid-stream

**Bottom Line:**

Instead of fixing the UI to mask execution failures, we need to add **stateful orchestration** with pause/resume capabilities. Otherwise, we're just polishing a fundamentally limited architecture while burning tokens on preventable failures.

**Should we be building Phase 5 (stateful orchestration with pause/resume) instead of Phase A-FIX? something else?**

## auditter:
You’re right: this is an **architecture** gap, not a UI gap. The missing primitive is *stateful orchestration with human-in-the-loop pause/resume*. That’s how the serious teams do it.

# Verdict

**Yes — promote “Phase 5: Stateful Orchestration (pause/resume)” to the top.** Keep a thin “Phase-A-Lite” only for the UI affordances needed to operate pause/resume (buttons, question panel, status timeline). Everything else should be built on a resumable workflow core. This aligns with industry patterns (Temporal signals + deterministic replay; Step Functions callback tokens; Azure Durable Functions external events; LangGraph interrupts/checkpoints). ([Temporal][1])

# What “production-grade” looks like elsewhere

* **Temporal**: workflows are deterministic, checkpointed event histories. You *pause* by waiting on a **signal**, then *resume* from the same history; timers/events don’t hold threads and execution continues exactly where it left off. ([Temporal][1])
* **AWS Step Functions**: the **callback task token** pattern literally *halts* a workflow for human approval/external work, then resumes upon token return (can wait up to a year). ([docs.aws.amazon.com][2])
* **Azure Durable Functions**: orchestrators **wait for external events** (`waitForExternalEvent`) to gather input or approval, then continue — canonical HITL. ([Microsoft Learn][3])
* **LangGraph (agents)**: built-in **interrupts** with a **checkpointer** persist graph state; you can pause indefinitely for human input and resume from the exact node. ([LangChain][4])
* Other workflow engines (Kestra, Orkes/Conductor) also ship first-class **pause/resume + human tasks** operators. ([kestra.io][5])

# Drop-in design for your stack (Node 20 + TS, no new deps unless justified)

## 1) Orchestrator state machine (server-side)

* **States**: `CLARIFYING → PLANNING → GENERATING → VALIDATING → TESTING → REPAIRING → DONE`
  Any state can emit an **INTERRUPT(reason, payload)** and transition to `PAUSED`.
* **Events**: `RESUME(payload)`, `CANCEL`, `TIME_BUDGET_EXCEEDED`, `NEEDS_APPROVAL("dangerous_action")`, `AMBIGUITY_FOUND(fields[])`.
* **Persistence** (reuse your evidence system):

  * Append-only **execution trace** (you already have `.automation/execution_trace.jsonl`).
  * **Checkpoint per step/substep** in `.automation/checkpoints/<session>/<seq>.json` (inputs, outputs, schema version, file checksums).
    This mirrors deterministic replay/event-sourcing patterns. ([Temporal][1])

## 2) Interrupts (HITL) & resume

* **When to interrupt** (examples):

  * `detectMissing()` finds ambiguity *mid-run* (not just preflight).
  * Contract gate needs a decision (e.g., delete/overwrite, network call).
  * Budget guard wants confirmation (LLM tokens/time about to exceed cap).
* **How**: raise `INTERRUPT` → persist a **question bundle** → park the workflow (no further LLM calls).
  Resume via `POST /api/sessions/:id/resume` with the answers; orchestration pulls the last checkpoint and continues the exact step.
  (This is the Step Functions callback token + Durable external event pattern, in your stack.) ([docs.aws.amazon.com][2])

## 3) Deterministic replay rules (so “resume” is honest)

* Save **inputs, prompts, model, seed, temps, tool I/O, and file diffs** at each checkpoint.
* On resume, **validate** fixture schema + **refuse** replay if code/contract versions diverged in incompatible ways (force re-capture from the prior checkpoint). That’s the Temporal determinism discipline. ([Temporal][1])

## 4) Budgets & partial re-runs (stop burning tokens)

* Keep your hierarchical timeouts (child < parent < plan), but **combine with interrupts**: if a step risks breaching budget, raise `INTERRUPT("budget_confirmation")` instead of failing. ([Microsoft Learn][3])
* For validation after a fix, run **impacted tests only** (Vitest related/changed; Playwright `--last-failed`) and **re-run failed CI jobs only** (GitHub `gh run rerun --failed`). This keeps confirmation loops seconds-level. ([Microsoft Learn][3])

## 5) Minimal UI (“Phase-A-Lite”) to drive orchestration

* Add a **Questions/Approvals drawer** (shows interrupt reason + fields); buttons: **Answer & Resume**, **Cancel**, **Skip with default**.
* Add **Pause** and **Resume** controls.
* Wire a basic **SSE** stream (`GET /api/progress/:sessionId`) so the UI updates instantly when the server pauses/resumes.
  (UX polish can come later; the orchestration semantics are the point.)

# CDI-style acceptance criteria (concise)

* **Deliverables**

  * `src/orchestrator/` with finite-state orchestration and event handlers.
  * `src/orchestrator/checkpoints.ts` with read/write & version checks.
  * `src/orchestrator/interrupts.ts` with reasons: `AMBIGUITY`, `APPROVAL`, `BUDGET`, `DANGEROUS_ACTION`, `MISSING_DEP`.
  * Endpoints:

    * `POST /api/execute` (start)
    * `POST /api/sessions/:id/answer` (resume with answers)
    * `POST /api/sessions/:id/pause` / `.../resume` / `.../cancel`
    * `GET /api/sessions/:id` (state snapshot), `GET /api/progress/:id` (SSE)
* **Gates**

  * Orchestrator can **pause on any state** and **resume** to completion with no loss of context.
  * Checkpoints pass schema validation; resuming from N is functionally equivalent to continuous run through N (determinism check). ([Temporal][1])
  * HITL path demonstrated with an **ambiguity** and an **approval** case (no extra LLM calls while paused). ([docs.aws.amazon.com][2])
  * Unit tests prove: pause/resume round-trip, refusal on stale fixtures, and idempotent event handling.
  * E2E: user answers mid-flight → system finishes without regenerating earlier steps.

# Answering your bottom-line question

* **Should we build Phase 5 now?** **Yes.** This is the core that stops token waste and enables mid-flight correction. The “pretty UI” work you planned (Phase A-FIX) can be trimmed to the controls needed to *operate* pause/resume; everything else sits on top of the orchestration spine. ([LangChain][4])

If you want, I’ll draft the Phase-5 contract (CDI format) with the exact files, schemas, endpoints, and tests so you can run it through your current validation gates and ship this as the new baseline.

[1]: https://community.temporal.io/t/what-is-missing-in-my-understanding-of-determinism-and-event-history-of-a-workflow-receiving-signals/16565?utm_source=chatgpt.com "What is missing in my understanding of determinism ..."
[2]: https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html?utm_source=chatgpt.com "Discover service integration patterns in Step Functions"
[3]: https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-external-events?utm_source=chatgpt.com "Handling external events in Durable Functions - Azure"
[4]: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/?utm_source=chatgpt.com "LangGraph's human-in-the-loop - Overview"
[5]: https://kestra.io/docs/how-to-guides/pause-resume?utm_source=chatgpt.com "Pause and Resume Flows in Kestra"
