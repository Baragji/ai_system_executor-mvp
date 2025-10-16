## part 1

Yes — the audit is accurate based on the current repo state and recent changes. The work it cites exists and passes validations, while governance docs and contracts are lagging.

Evidence Check

LangGraph adapter + feature flag present: src/orchestrator/adapter.ts
Graph stub wired and now tracked as executions: src/orchestrator/graph.ts:27
Executions status API exists: src/server.ts:427 (GET /api/executions/:id)
Feature-flag branch delegates correctly: src/server.ts:1538
RFC 9457 helper installed and env‑gated: src/middleware/problemDetails.ts
Docs drift is real: AGENTS.md (last updated 2025‑10‑08), CDI_INFRASTRUCTURE.md still shows “Current Phase: A”
Compliance report is stale/failing by design: .automation/contract_compliance_report.json
Recommendation

Approve to proceed with the auditor’s plan.
Why Approve

Aligns governance with already‑shipped, non‑breaking, feature‑flagged work.
Closes contract/evidence gaps without changing runtime behavior by default.
Unblocks CI reporting and phase tracking (no code risk, high clarity gain).
Keeps rollback trivial (unset AGENTS_RUNTIME).
Approval Scope

Create Phase 19/20 contracts
contracts/Roadmap_execution/19_autonomous_transition_contract.json
contracts/Roadmap_execution/20_langgraph_executions_contract.json
Encode completed vs. pending milestones (Trust Spine T0 partial, executions API complete).
Update governance docs
AGENTS.md: add Feature Flags (AGENTS_RUNTIME, OTEL_ENABLED, PROBLEM_DETAILS_ENABLED), Trust Spine requirements, current phase.
CDI_INFRASTRUCTURE.md: set Current Phase to 19/20, add Trust Spine section and flag workflow.
Document Trust Spine completion criteria
CycloneDX SBOM, SLSA provenance, JSONL action logs, OTel traces, RFC 9457 evidence.
Guardrails and Notes

No protected schemas are changed; adding contracts (not schema) is safe.
New dependencies for CycloneDX/OTel should be justified or deferred; keep everything env‑gated.
Maintain feature flags as the safety net until contracts and evidence pass gates.
If You Prefer to Ask First

Do you want CycloneDX/SLSA now (new dev deps), or defer with placeholders?
What acceptance criteria mark Trust Spine T0 as “done” in CI?
Any constraints on contract naming standardization and backfilling older files?
Should problem-details be enabled by default in non‑prod?
If you want, I can draft the two contract JSONs and propose doc edits in a PR aligned to these gates.

what does this mean and what is it? "Should problem-details be enabled by default in non‑prod?

"


It refers to enabling standardized JSON error responses (Problem Details) by default in dev/test, instead of the legacy { error: "..."} shape.

What it is

A standard error envelope (RFC 9457) returned as Content-Type: application/problem+json with fields: type, title, status, detail, instance, plus extras.
In this repo:
Toggle: set PROBLEM_DETAILS_ENABLED=1
Middleware: src/middleware/problemDetails.ts:1
Installed early in app startup: src/server.ts:109
Helper auto-selects shape: respondWithProblem() returns problem+json when enabled, legacy JSON otherwise.
What “enable by default in non-prod” means

In dev/test, turn the flag on so all errors return the problem+json shape without needing to set it per-run.
Practically: add PROBLEM_DETAILS_ENABLED=1 to your .env (and/or CI test env) or run PROBLEM_DETAILS_ENABLED=1 npm run dev.
Example response (problem+json)

{
"type": "about:blank",
"title": "BadRequest",
"status": 400,
"detail": "prompt required",
"instance": "/api/clarify",
"urn:ts": "2025-10-13T09:00:00.000Z"
}
Pros of enabling in non-prod

Consistent, self-describing error schema across routes.
Easier debugging and contract tests (keys and semantics are predictable).
Aligns with Trust Spine goals and evidence (standardized error envelope).
Cons / considerations

Dev/test behavior differs from prod if prod keeps the legacy shape; tests might not catch prod-specific error formatting issues.
Clients must parse application/problem+json; if your UI or scripts expect { error }, update them (or keep the helper’s fallback in prod until ready).
Recommendation

Yes: enable problem-details by default in non-prod to normalize and harden error handling while keeping prod default unchanged until clients are ready.
How:
Local: add PROBLEM_DETAILS_ENABLED=1 to .env.
Ad-hoc: PROBLEM_DETAILS_ENABLED=1 npm run dev.
CI (tests that rely on it): set the env in the job; note existing tests already toggle the flag per-test.
Keep both code paths tested (there are tests for each) until you intentionally switch prod over.
If you want, I can add a short “Feature Flags” section to AGENTS.md describing PROBLEM_DETAILS_ENABLED and recommend it for non‑prod.


## part 2

Here’s the short version:

* **“Current RFC” (Oct 2025):** It’s **RFC 9457 – Problem Details for HTTP APIs**. It **obsoletes RFC 7807** and is the spec you should cite. ([RFC Editor][1])
* **Your write-up is basically correct.** Problem Details uses **`Content-Type: application/problem+json`** and the members **`type`, `title`, `status`, `detail`, `instance`** (+ extensions). ([RFC Editor][1])

# Accuracy check on your definition

**Correct**

* Media type and fields list are right per RFC 9457. ([RFC Editor][1])
* Using a feature flag to roll out in non-prod first is sensible. (Spec doesn’t mandate rollout strategy.)

**Tighten these points**

1. **`about:blank` title** — When `type` is `"about:blank"`, the **`title SHOULD be the standard HTTP reason phrase** (e.g., “Bad Request”), not “BadRequest”. ([RFC Editor][1])
2. **Extension member naming** — Keys like `"urn:ts"` **SHOULD** start with a letter and use only letters/digits/underscore, length ≥ 3 (e.g., `occurred_at`, `trace_id`). Colons in names are discouraged. ([RFC Editor][1])
3. **`status` is advisory** — Keep it in sync with the actual HTTP status; clients mustn’t rely on it over the HTTP status line. ([RFC Editor][1])
4. **Content negotiation** — It’s fine to return `application/problem+json` **even if not explicitly in `Accept`** (HTTP allows it), but prefer adding it to your clients/tests. ([RFC Editor][1])
5. **Validation errors** — Prefer a typed `type` URI (under your domain) and an `"errors"` extension array using JSON Pointers for field issues. ([RFC Editor][1])
6. **Problem types** — Long-term, avoid `about:blank`; mint stable `type` URIs and (optionally) document them; there’s now an **IANA registry** for common types. ([RFC Editor][1])

# Suggested example (revised)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
Content-Language: en

{
  "type": "https://api.example.com/problems/prompt-required",
  "title": "Bad Request",
  "status": 400,
  "detail": "The 'prompt' field is required.",
  "instance": "/api/clarify",
  "trace_id": "01HZY6W8B9C2D3E4",
  "occurred_at": "2025-10-13T09:00:00Z",
  "errors": [
    { "detail": "Required", "pointer": "#/prompt" }
  ]
}
```

Why: correct title for `about:blank` case (or better: use a real `type` URI), advisory `status` matches the HTTP status, RFC-style validation errors via `errors` + JSON Pointers, and extension names follow naming guidance. ([RFC Editor][1])

# Rollout guidance (Dev/Test by default, Prod later)

**Recommendation:** 👍 Enable Problem Details by default in **dev/test** now, and plan a short migration to enable it in **prod** once clients are ready.

* **Dev/Test default:** Keep your `PROBLEM_DETAILS_ENABLED=1` approach. It normalizes error contracts and improves testability. ([RFC Editor][1])
* **Client readiness:** Update UI/scripts to parse `application/problem+json`; rely on HTTP status for control flow, not the body’s `status`. ([RFC Editor][1])
* **Content negotiation:** Add `Accept: application/problem+json` in test clients; servers may still return Problem Details without it, but declaring intent is cleaner. ([RFC Editor][1])
* **Security hygiene:** Do **not** leak stack traces or internals in `detail`; keep it user-actionable. ([RFC Editor][1])
* **Validation pattern:** Use a stable `type` per validation failure family (e.g., `/problems/validation-error`) and the `"errors"` array as above. ([RFC Editor][1])
* **Problem Type docs:** Host a simple HTML page at each `type` URI explaining remediation; this is **RECOMMENDED** by the spec and helps integrators. ([RFC Editor][1])
* **Registry awareness:** If a common type fits your case, you can reuse a registered one; otherwise mint your own under your domain. ([RFC Editor][1])

# Concrete tweaks to your repo notes

* **ENV flag:** keep `PROBLEM_DETAILS_ENABLED=1` for non-prod `.env` and CI.
* **Middleware:** ensure it sets `Content-Type: application/problem+json`; optionally set `Content-Language`. ([RFC Editor][1])
* **Helper:** keep legacy `{ error: "…" }` only as a temporary fallback for prod; add tests for **both** paths until the prod switch. (Spec warns `status` vs HTTP code can diverge; your tests should assert equality.) ([RFC Editor][1])
* **Docs:** Add a short **“Feature Flags”** section mentioning `PROBLEM_DETAILS_ENABLED` and link to RFC 9457 + your problem type docs. ([RFC Editor][1])
