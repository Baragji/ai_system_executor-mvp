Here’s the crisp “who/what/why/when/where” so we’re 100% in sync—and then my reply to the assistant.

---

# ✅ Summary (so we stay aligned)

## What we’re doing

Building an **autonomous AI coding executor** that can take a prompt, **generate an app**, and **prove** it’s production-ready via **tests + evidence**. “Green” means: a **fresh generation** passes its **own tests** with **zero manual edits**, and CI attaches a **proof bundle** (test report, SBOM, vuln/SAST outputs, fixtures). That proof becomes a **required** gate on a **protected branch**. ([GitHub Docs][1])

## Why we’re doing it

* We found correctness gaps (health endpoint drift; repair loop stalling on incomplete artifacts; ambiguous UI outcomes).
* The goal is a **Trust Engine posture**: deterministic contracts at generation time, **schema-first** repair guardrails, and **evidence-gated** merges (status checks must pass before merge). ([Ajv][2])

## Who’s doing what

* **You (lead dev / me):** define Definition of Done (DoD), review PRs, enforce gates, accept only evidence-backed claims.
* **Assistant (executor engineer):** implement generator-time health normalization & runner-aware tests, finish repair-intake contract (retry → Ajv validate → synthesize or explicit fail), add E2E CI check + artifacts, finalize planner timeouts & jitter.
* **GitHub rules:** CODEOWNERS approval for workflow files; branch protection requires the E2E job to be **Required**. ([GitHub Docs][3])

## When (now → proof)

* **Now:** generator-time `/health` normalizer and runner-aware seeding are in; repo tests green.
* **Next:** finish repair-intake enforcement; remove repair-time “quick patches”; wrap long phases with `AbortSignal.timeout()` + jitter; open PR with the **generated-app-e2e** workflow; mark it **Required**; run a fresh, fully-traced generation and attach the proof bundle. ([MDN Web Docs][4])

## Where (paths & artifacts)

* **Normalization & seeding:** `src/utils/normalizeHealth.ts`, `src/utils/seedTests.ts`, invoked from `src/server.ts`.
* **Repair intake:** `src/repair/multiTurnRepair.ts` (retry → Ajv validation → synthesize or `REPAIR_INCOMPLETE_ARTIFACT`). Ajv is our JSON Schema 2020-12 validator. ([Ajv][2])
* **E2E workflow (proposal → required):** `.automation/proposals/workflows/generated-app-e2e.yml` → `.github/workflows/*` (via CODEOWNERS PR). Required check enforced in **branch protection**. ([GitHub Docs][3])
* **Proof bundle artifacts:**

  * **Test report** from the *generated* app (Vitest/Jest discoverable patterns; >0 executed). ([Vitest][5])
  * **SBOM** from the *generated* app via `npm sbom` (SPDX or CycloneDX). ([npm Docs][6])
  * **Vuln scan** via **OSV-Scanner** action (advisory ok initially). ([Google GitHub][7])
  * **SAST** via **Semgrep CI** (native configuration).
  * **Session fixtures**: plan, initial/final tests, repair history, LLM traces.

---
