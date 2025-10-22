# Universal Boundary Enforcement — **Merged Research Brief**  
**(For GPT/Copilot & Claude — model‑agnostic core with model adapters)**

- **Owner:** Yousef Baragji (handoff to Research Assistant)
- **Version:** 1.0 (Oct 16, 2025)
- **Evidence Window (SSOT default):** Jan 2024 → Aug 2025 (extend to Oct 2025 only if essential and flagged)
- **Objective (one‑liner):** Identify and validate a **pre‑execution, deny‑by‑default enforcement pattern** that prevents internal→public leaks and other boundary violations by any AI coding agent, and specify a policy‑as‑code implementation that survives context loss and toolchain variance.

---

## 1) Scope & Definitions (single glossary)
- **PRODUCT vs WORKFLOW:** Product code/content vs. process/ops artifacts.  
- **INTERNAL vs PUBLIC:** Internal (private repos, keys, docs); Public (OSS, published APIs).  
- **Protected Paths:** Files, repos, endpoints, env vars, secrets, datasets that require explicit allow.  
- **Preflight:** Mandatory **classification + policy check** executed *before* any code command, file write, network call, or tool invocation.  
- **Deny‑by‑Default:** Unknown/ambiguous → **BLOCK** until human approval.

---

## 2) Primary Research Questions
1. What **pre‑execution enforcement** architectures exist (IDE hooks, agent middlewares, CLI gates, policy engines) and which is **most enforceable** across GPT/Copilot/Claude?  
2. What is the minimal, universal **Classification Protocol** (internal/public, product/workflow, sensitivity, destination) that agents can complete reliably **before** action?  
3. How to achieve **context‑resilience** (survive prompt resets, tab reloads, chain restarts) with verifiable state?  
4. Which **policy‑as‑code** stack (e.g., OPA/Rego, Cedar, custom JSON rules) best balances **enforceability, latency, maintainability**?  
5. How to measure and reduce **false positives/negatives** without weakening protection?  
6. What **human‑factors** levers (UX, copy, checklists, friction) measurably reduce violations?

---

## 3) Method (reproducible protocol)
**Source Taxonomy:**  
- **Standards/Regulation:** OWASP ASVS/Top‑10, NIST SSDF 800‑218, ISO/IEC 42001, EU AI Act guidance.  
- **Policy Engines:** OPA/Rego, Conftest, Gatekeeper; AWS Cedar/Verified Permissions; GH rulesets.  
- **Agent/IDE Hooks:** GitHub Copilot Agents Panel, OpenAI function/tool calling patterns, CLI orchestration, commit gates.  
- **Case Studies:** Incidents/retro posts from AI agent teams; blog posts, whitepapers, eng talks.  
- **Observability/Governance:** Audit trails, evidence logs, SBOM/SLSA tie‑ins.

**Inclusion Criteria:** 2024–2025, primary/official sources or credible engineering write‑ups; concrete mechanisms, measurable results.  
**Exclusion:** Pure opinion pieces without mechanisms/metrics; pre‑2024 unless seminal.

**Search Matrix (build a CSV):**  
- Columns: `query`, `source_type`, `link`, `date`, `org`, `mechanism`, `latency_ms`, `enforceability_score`, `context_resilience`, `notes`, `evidence_hash`.  

**Extraction Form (per source):**  
- Mechanism diagram/steps, prerequisites, policy model, integration points, perf, failure modes, comparable deployments, validation evidence.

**Evaluation Rubric (weights)**  
- **Enforceability (30%)** — can it block before action, across tools?  
- **Context‑Resilience (20%)** — survives resets with state proofs.  
- **Integration Effort (15%)** — LOC/complexity, blast radius.  
- **Runtime Overhead (10%)** — preflight median p95 ≤150ms.  
- **FP/FN Risk (15%)** — measured on mixed task‑set.  
- **Maintainability (10%)** — policy readability, versioning.

**Synthesis:** Rank top 3 patterns, provide **decision matrix**, pick 1 with **go/no‑go** criteria and fallback.

---

## 4) Required Deliverables (repo‑ready)
- `docs/guardrails/ENFORCEMENT_SPEC.yaml` — policy‑as‑code rules.  
- `docs/guardrails/PROTECTED_PATHS.yaml` — file/repo/endpoint registry.  
- `docs/guardrails/PREFLIGHT_FORM.yaml` — mandatory classification fields.  
- `docs/guardrails/evidence.schema.json` — proof log schema.  
- `tools/preflight/cli/` — tiny CLI (loads spec, prompts form, returns **ALLOW/DENY** + evidence JSON).  
- `tests/violations/01_claude_leak.spec.md` — reproduce prior internal→public leak (must **DENY**).  
- `tests/violations/02_generic_boundary.spec.md` — generic boundary write (must **DENY**).  
- `docs/research/findings.md` — ranked mechanisms + decision.  
- `docs/research/source_matrix.csv` — populated matrix.  
- `docs/research/query_bank.md` — queries used (copy‑paste‑ready).

---

## 5) Acceptance Criteria (must all pass)
- Known leak scenario blocks **before** any code write/net call.  
- **Deny‑by‑default** when classification is incomplete/ambiguous.  
- Preflight p95 ≤ **150ms**, 0% silent bypass in 100 runs.  
- Rubric scored for each candidate; decision matrix included.  
- FP/FN trial on **10 mixed tasks** documented; thresholds agreed.  
- Evidence logs include hashes, timestamps, decision reason, spec version.

---

## 6) Experiments & Validation
- **E1:** Replay historical violation; expect **DENY** with evidence.  
- **E2:** Context reset mid‑session; verify enforcement re‑asserts automatically.  
- **E3:** Latency/load test (100 sequential preflights).  
- **E4:** FP/FN trial on mixed “safe” vs. “risky” tasks.  
- **E5:** Human‑factors A/B: short vs. long copy; checklist vs. free‑text.

---

## 7) Implementation Templates (skeletons)

**`ENFORCEMENT_SPEC.yaml` (skeleton)**
```yaml
version: 1
deny_by_default: true
rules:
  - id: prevent-internal-to-public
    if:
      - context.classification.internal == true
      - action.destination in ["public_repo", "public_endpoint"]
    then: DENY
  - id: require-classification
    if: missing(context.classification.required_fields)
    then: DENY
logging:
  evidence: docs/guardrails/evidence.schema.json
performance_budget_ms: 150
```

**`PREFLIGHT_FORM.yaml` (skeleton)**
```yaml
required:
  - content_type   # product|workflow
  - visibility     # internal|public
  - sensitivity    # low|moderate|high
  - destination    # repo|endpoint|file|other
  - justification  # short rationale
```

**`evidence.schema.json` (skeleton)**
```json
{
  "type":"object",
  "required":["ts","actor","action","decision","spec_version","hashes","form"],
  "properties":{
    "ts":{"type":"string"},
    "actor":{"type":"string"},
    "action":{"type":"string"},
    "decision":{"type":"string","enum":["ALLOW","DENY"]},
    "spec_version":{"type":"string"},
    "hashes":{"type":"object"},
    "form":{"type":"object"}
  }
}
```

---

## 8) Model Adapters (appendices)

**A) GPT/Copilot Adapter (concise)**
- Invoke **preflight CLI** for any `write/exec/net` tool.  
- Agent must echo **Quick Reference (3 bullets)** each turn.  
- On context loss, reload `ENFORCEMENT_SPEC.yaml` + last evidence entry; refuse to act without fresh preflight.

**B) Claude Adapter (concise)**
- Same hooks; explicitly block “convert internal→public” intents.  
- Forces classification; if `visibility=internal` **and** destination is public → **DENY** with reason.  
- Re‑assert spec every N=5 turns or on toolchain reset.

---

## 9) Plan, Roles, Timeline
- **T0 (today):** Create source matrix + query bank; confirm rubric.  
- **T+2 days:** Collect/score top candidates; draft spec + form.  
- **T+4 days:** Build preflight CLI; run E1–E3.  
- **T+5 days:** FP/FN trial (E4), human‑factors A/B (E5).  
- **T+6 days:** Final findings + decision matrix; PR with artifacts.

**Roles:** Researcher (primary); Reviewer (secondary); Integrator (preflight CLI); QA (experiments).

---

## 10) Risk & Mitigation
- **Agent bypass risk:** Enforce at **tooling layer** (CLI/gateway), not only prompts.  
- **Latency creep:** Budget 150ms; cache spec; local read‑only mount.  
- **FP pain:** Narrow rules; whitelist controlled paths for low‑risk ops.  
- **Drift:** Versioned spec + evidence logs; periodic policy reviews.

---

### Handoff Instruction (to your assistant)
Execute Section 3 **Method**. Produce all artifacts in Section 4. Validate against Section 5. Record everything in `docs/research/findings.md`. Raise a decision PR.
