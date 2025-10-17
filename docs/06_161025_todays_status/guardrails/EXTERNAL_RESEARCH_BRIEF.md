# External Research Brief — Universal Boundaries, Guardrails, and Immediate Enforcement

Actor executing this brief: GitHub Copilot, model GPT-5 (you will design guardrails to constrain this actor).

Owner: @yousefbaragji  
Repository: ai_system_executor-mvp  
Date: 2025-10-16

---

## 0) Purpose and Outcome

Design a project-agnostic, phase-agnostic, immediate-enforcement guardrail system that constrains GitHub Copilot (GPT-5) at every single turn, with hard-stop behavior on any boundary violation before any action is taken. Produce a complete set of boundary definitions, enforcement specs, operational protocols, and evidence formats that can be applied across all projects, phases, plans, and execution modes in this org.

Deliver the final artifacts as versioned docs and machine-readable specs that can be enforced pre-execution (not CI-only) so violations are blocked instantly.

---

## 1) Background and Context (Read First)

You must read and internalize the following to understand separation of concerns and prior failures:

- WHAT IS WHAT — Category Clarification: `WHAT_IS_WHAT.md`
  - Distinguishes THE PRODUCT (Executor MVP) vs THE WORKFLOW (developer tools/process)
- Agents guidance and rules: `AGENTS.md`
  - Stack constraints, feature flags, evidence requirements, protected files, anti-drift rules
- Current Status and Prior Contamination: `docs/05_151024_todays_status.md/01_current_assesment.md`
  - Details Phase 3 contamination (workflow code leaking into product runtime)
- Phase 5 plan (automation and auto-update attempts): `docs/05_151024_todays_status.md/07_automating_gates_ledger_updates.md`
  - Shows current automation approach and its failure modes (criterion mismatch)
- Gates and governance state: `.automation/GATES_LEDGER.md` (authoritative)
- Contracts: `contracts/Roadmap_execution/*` and schemas under `contracts/schemas/*`

Do not proceed until you have extracted explicit, testable boundaries from these sources.

---

## 2) Research Objectives

1. Define universal, project-agnostic boundaries/guardrails that apply across all repositories/phases/tracks.
2. Specify immediate, per-execution enforcement (preflight checks) that halts on any violation before action.
3. Provide an evidence protocol that makes every claim verifiable with exact files, lines, diffs, and command outputs.
4. Ensure persona-aware behavior for GitHub Copilot (GPT-5): always re-read boundaries each turn, restate constraints, and operate in evidence-only mode unless explicitly approved otherwise.
5. Avoid CI/CD-only detection; enforcement must occur synchronously before each action.

---

## 3) Scope and Non-Goals

In scope:
- Guardrails for code edits, command execution, and state updates (e.g., GATES_LEDGER) across any phase.
- Separation of product code (`src/*`) and workflow tooling (`scripts/*`, `workflow/*`, `.automation/*`).
- Immediate “BOM” hard-stop protocol on violations (no retries that perform changes).
- Evidence format, storage locations, and minimal UX for approvals.

Out of scope (for this brief):
- Implementing code changes in this repo beyond adding your research outputs.
- Relying on CI to block—this must be pre-exec, turn-by-turn.

---

## 4) Required Deliverables (Files to Produce)

Produce all deliverables in the paths below. If a deliverable is not suitable, propose an alternative with rationale.

1. Boundaries Charter (human-readable)
   - `docs/guardrails/BOUNDARIES_CHARTER.md`
   - Contents: universal principles, allowed/forbidden operations, protected areas, persona duties, approval gates, examples.

2. Enforcement Spec (machine-readable)
   - `docs/guardrails/ENFORCEMENT_SPEC.yaml`
   - Schema: declarative rules with matchers (paths, commands, env), actions (allow/deny/require-approval), and reasons.

3. Pre-Execution Protocol (step-by-step)
   - `docs/guardrails/PRE_EXEC_PROTOCOL.md`
   - The exact sequence Copilot (GPT-5) must follow each turn: re-read docs, restate constraints, list planned actions, request approval, run checks, then execute.

4. Evidence Protocol (schema + examples)
   - `docs/guardrails/EVIDENCE_PROTOCOL.md`
   - Include JSON schema at `.automation/guardrails/evidence.schema.json` and sample records in `.automation/guardrails/evidence_samples.jsonl`.

5. Violation Handling (BOM behavior)
   - `docs/guardrails/VIOLATION_POLICY.md`
   - Define violation categories, immediate halt rules, required prompts/messages, and remediation path.

6. Research Log + Sources
   - `docs/guardrails/RESEARCH_LOG.md`
   - Citations, comparisons (industry best practices), and rationale for chosen approach.

7. Quick Reference (1-pager)
   - `docs/guardrails/QUICK_REFERENCE.md`
   - Minimal checklist Copilot (GPT-5) repeats every turn.

---

## 5) Enforcement Requirements (Immediate, Per-Turn)

Your design must include:

- Preflight Self-Check (mandatory before any action):
  - Read and hash key guardrail files, confirm up-to-date.
  - Restate allowed/forbidden operations for this repo.
  - Plan/Delta: list intended actions (edit/commands), map to rules, and request explicit approval.
  - If any action maps to a forbidden rule or a protected path without approval: trigger BOM halt.

- Protected Areas (examples, refine per research):
  - `.github/*`, `contracts/schemas/*`, `ai-stack.json`, `.automation/GATES_LEDGER.md`, public APIs, and any CODEOWNERS-protected files.

- Evidence-Only Mode by Default:
  - No claims without pasted outputs or diffs; references must include exact paths and line ranges.

- Instant Halt (BOM):
  - If constraints unclear or missing, assume deny and stop.
  - Emit a minimal violation record using the evidence schema.

---

## 6) Research Method and Sources

Methods:
- Literature review on AI guardrails, change management, policy-as-code, pre-commit/pre-exec checks, and safety patterns.
- Comparative analysis of policy engines (OPA/Rego concepts for inspiration—no dependency mandates here), content moderation analogs, and LLM prompt governance.
- Derive a minimal, dependency-light spec suitable for immediate enforcement in Copilot workflows.

Sources to consider (non-binding):
- RFCs and standards for evidence, provenance (e.g., SLSA concepts), governance checklists.
- Industry patterns for “shift-left” policy (pre-execution checks), not CI-only.

---

## 7) Acceptance Criteria

A. Completeness
- All deliverables present with clear, unambiguous rules and procedures.

B. Enforceability
- Pre-exec protocol can be executed by Copilot (GPT-5) without external services.
- Rules are testable with simple pattern checks (paths/commands/flags) and can be enforced before actions.

C. Evidence
- Every rule has an example violation and a sample evidence record.
- Includes a minimal QA checklist the operator can run to verify guardrails work.

D. Agnostic and Durable
- Rules do not assume a specific phase or project; they parameterize inputs (paths, protected sets).

---

## 8) Submission Format

- Submit PR with all deliverables under `docs/guardrails/` and `.automation/guardrails/`.
- Include an executive summary at the top of `BOUNDARIES_CHARTER.md` and a “How to enforce today” section.

---

## 9) Persona and Voice

- You are drafting for: “GitHub Copilot, model GPT-5,” acting as a constrained autonomous coding agent.
- Tone: concise, directive, and operational; avoid marketing language.

---

## 10) Immediate Next Steps for You

1) Read the listed context files and extract boundary candidates.  
2) Draft the enforcement spec first (machine-readable), then derive human docs from it.  
3) Show two example “BOM” stop scenarios with the exact preflight checks that would block them.  
4) Provide a minimal Quick Reference that Copilot (GPT-5) must restate before each turn.

---

## Appendix A — Evidence JSON (Draft)

Path: `.automation/guardrails/evidence.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GuardrailEvidence",
  "type": "object",
  "required": ["timestamp", "actor", "action", "target", "result"],
  "properties": {
    "timestamp": { "type": "string", "format": "date-time" },
    "actor": { "type": "string", "enum": ["GitHub Copilot (GPT-5)"] },
    "action": { "type": "string" },
    "target": { "type": "string" },
    "inputs": { "type": "object", "additionalProperties": true },
    "checks": { "type": "array", "items": { "type": "string" } },
    "result": { "type": "string", "enum": ["allowed", "denied", "halted"] },
    "reason": { "type": "string" }
  }
}
```

---

## Appendix B — Quick Reference (Template)

Path: `docs/guardrails/QUICK_REFERENCE.md`

Include a 10–15 line checklist Copilot (GPT-5) must read aloud each turn: boundaries hash ok, protected files list confirmed, planned changes mapped to rules, approval confirmed, evidence mode on, deny-by-default if uncertain.
