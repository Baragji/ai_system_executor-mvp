Love the update—thanks for the precise diff. Here’s a tight, **evidence-backed** plan keyed to what you’ve already shipped, with clear “why” and minimal new surface area.

---

# What you already did — and should keep

* **Replay + fixtures are live** (Executor UI link + API) → perfect for fast forensics.
* **Planner timeout ceiling via `.env`** → removes the early halt you observed.
* **Repair hardening** (single retry, then safely drop incomplete artifacts; infer from `files[]`) → unblocked dependency fixes without weakening integrity.
* **DX scripts** for targeted tests (changed/related/failed) → speeds iteration.
* **Gates green** (lint, typecheck, tests, contract, sbom) → keeps the trunk healthy.

Keep all of this. It directly addresses the incident you saw, with no unnecessary creep.

---

# What to do next (ranked, small, high-ROI)

## 1) Make **test execution deterministic** for every generated app

**What:** Always emit one Vitest-discoverable spec (e.g., `tests/api.spec.ts`) and set `"test": "vitest run --reporter=default"` in the generated `package.json`.
**Why:** Vitest only discovers files matching its default patterns (`**/*.{test,spec}.?(c|m)[jt]s?(x)`); otherwise you’ll see “0 passing / 0 failing,” which looks like failure in your Executor UI. A single seed spec prevents that ambiguity. ([vitest.dev][1])

*Tip:* For API checks, Supertest is the conventional Express helper; it keeps tests in-process and fast. ([vitest.dev][2])

## 2) Tell the **truth in the Executor UI** (state machine tweak)

**What:** In `computeOutcome`, treat **“not executed”** as **error** (e.g., `executed = passCount + failCount > 0`).
**Why:** Aligns user perception with reality; test frameworks distinguish “executed pass/fail” from “no tests ran.” It also makes your progress cards an accurate signal. (The discovery patterns above explain why 0/0 happens.) ([vitest.dev][3])

## 3) Planner resilience: timeouts + cancel + jitter

**What:** Keep the higher `PLAN_MAX_DURATION_MS`, but also wrap long phases with `AbortController`/`AbortSignal.timeout()` and **capped exponential backoff with jitter** on network/package steps.
**Why:** This is the standard resiliency trio in distributed systems—prevents stalls and thundering herds, and lets you cancel cleanly from the UI. MDN documents `AbortSignal.timeout()`; AWS recommends jitter with backoff. Node timers also accept an `AbortSignal`. ([developer.mozilla.org][4])

## 4) Keep the repair fallback—add one **contract guardrail**

**What:** Before applying post-retry fallbacks, validate the payload against your repair JSON Schema (Ajv). Disallow **destructive ops** (delete/overwrite) unless there’s a full file body.
**Why:** You keep the pragmatic “don’t stall on partial artifacts” behavior *and* ensure you never half-apply risky edits. This is the “schema-first outputs + single leniency window” pattern widely used in LLM guardrails. (Schema validation as a guard is standard practice.) ([GitHub][5])

## 5) Flip the **Trust-Engine gates** from “wired” → **enforced**

* **CODEOWNERS**: file must be literally `CODEOWNERS` in `.github/`, repo root, or `docs/` for GitHub to honor it. You already placed it—just confirm the path. ([GitHub Docs][6])
* **Required checks**: in branch protection/rulesets, make `lint`, `typecheck`, `test`, `contract-schema`, `sbom` **blocking** so merges prove themselves. (This is how big teams avoid drift.) ([GitHub Docs][6])
* **SBOM**: you’re already generating it; the official CLI supports **SPDX** or **CycloneDX**—store per-PR. ([docs.npmjs.com][7])
* **Vulns + SAST**: add **OSV-Scanner** (official action) and **Semgrep** (use the *native* Semgrep CI config—wrapper is deprecated). Start advisory; make blocking once signal quality is tuned. ([google.github.io][8])

---

# Why this order?

* **#1 and #2** eliminate the single most confusing class of runs: “app is fine, UI says partial with 0/0”. (Vitest patterns explain the 0/0; your UI fix stops mislabeling.) ([vitest.dev][1])
* **#3** hardens long phases without forcing new replay endpoints right now (you already have replay where you need it). The AbortSignal/backoff pattern is the mainstream design for reliability. ([developer.mozilla.org][4])
* **#4** keeps your successful repair fallback but ensures integrity using schema validation—a common guardrail in LLM systems. ([GitHub][5])
* **#5** turns CDI evidence into *gates*, not just artifacts—exactly how GitHub intends CODEOWNERS + required checks to be used. ([GitHub Docs][6])

---

# Risks & how we mitigate them

* **Surface area creep** from new endpoints — *Defer.* You correctly skipped step-level replay endpoints; add them later with tests if you need deeper forensics.
* **Hanging phases** despite higher timeout — *Mitigate with cancel + jittered retries* so you can cut runs cleanly and avoid synchronized retries. ([Amazon Web Services, Inc.][9])
* **Silent partial edits** in repair fallback — *Mitigate with schema validation and disallow destructive ops without full content.* ([GitHub][5])
* **Security signal noise** — *Start OSV/Semgrep as advisory* and promote to blocking once rules are tuned. ([google.github.io][8])

---

# “Done” looks like this (Phase-A finish)

* Every generated app ships ≥1 **Vitest** spec; Executor never shows 0/0 again. ([vitest.dev][1])
* Executor outcome cards:

  * **success** = tests executed + pass
  * **partial** = tests executed + fail
  * **error** = tests not executed or system error
* Planner phases are **cancelable** with timeouts and **jittered backoff**. ([developer.mozilla.org][4])
* Repair can retry once; fallbacks apply only under a **schema-validated** contract (no destructive ops without content). ([GitHub][5])
* CI gates: `lint`, `typecheck`, `test`, `contract-schema`, `sbom` **required**; **SBOM** attached; **OSV** + **Semgrep** run on PRs. ([docs.npmjs.com][7])

---
