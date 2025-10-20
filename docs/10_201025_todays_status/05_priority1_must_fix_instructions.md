# Priority 1 — MUST FIX (Blockers)

Goal: Resolve all blockers before any refactoring execution. This unlocks safe, CDI-compliant progress in 30–45 minute batches.

Scope (complete all):
- Add Batch 0 discovery (artifacts + evidence)
- Re-size plan to 30–45 minute batches (~51 batches)
- Update AGENTS.md with refactoring-specific guidance (via PR; protected file)
- Publish a dependency matrix to control order/parallelization

Notes:
- Do NOT edit protected files directly. Submit changes to AGENTS.md via PR for CODEOWNERS review.
- Keep all feature flags OFF by default; monolith must remain functional at all times.

---

## 1) Batch 0 — Discovery Artifacts (MANDATORY)

Deliverables:
- .automation/refactor_services_discovery.json
- .automation/refactor_services_discovery.md

What to do:
1. Scan all services for deep imports and monolith coupling.
   - Pattern to search: ../../../../src/ and absolute monolith imports from src/
2. For each service (llm-gateway, orchestrator, runner, planning, repair, executor, clarification):
   - List files and lines importing from monolith
   - List runtime env vars used
   - List external deps (npm packages) referenced
   - Identify routes/endpoints impacted
   - Risk assessment (LOW/MEDIUM/HIGH)
3. Write human-readable summary (.md) + machine-oriented summary (.json).

Suggested commands (document these outputs inside the artifacts):
- grep -rn "\../../../../src/" services/ | sort
- grep -rn "from 'src/" services/ | sort

Minimal JSON shape (example):
{
  "discovery_type": "microservices_refactoring",
  "date": "YYYY-MM-DD",
  "services": [
    {
      "name": "llm-gateway",
      "deep_imports": [
        {
          "file": "services/llm-gateway/src/routes/complete.ts",
          "line": 3,
          "import": "../../../../src/llm/providers/openai.ts",
          "snippet": "import { OpenAIProvider } from '../../../../src/llm/providers/openai';"
        }
      ],
      "dependencies": ["openai", "anthropic"],
      "environment_vars": ["LLM_GATEWAY_URL", "PORT"],
      "routes_impacted": ["POST /complete"],
      "risk_assessment": "MEDIUM"
    }
  ],
  "stack_compliance": {
    "typescript_only": true,
    "no_python": true,
    "no_frontend_frameworks": true
  }
}

Acceptance criteria:
- [ ] Both discovery files exist in .automation/
- [ ] Every deep import is listed with file:line
- [ ] Env vars and external deps captured per service
- [ ] Stack compliance confirmed (no .py, frontend only under /public)
- [ ] npm run contract:check passes (no schema changes required)
- [ ] npm run lint && npm run typecheck && npm test all pass

Rollback:
- Discovery is read-only. If validation fails, fix the artifacts and re-run validations.

---

## 2) Re-size Plan to 30–45 Minute Batches

Deliverables:
- docs/10_201025_todays_status/06_revised_batches_plan.md

What to do:
- Split each original oversized batch into atomic 30–45 minute steps.
- Use the proven pattern:
  - Extraction per service: copy → fix internal imports → update routes → add deps → boot test (5 steps)
  - Integration per service: client skeleton → feature flag → env/docs → tests → integration test (5 steps)
- Produce ~51 batches total, each with: goal, files to touch, validations, acceptance criteria, and rollback.

Example entry (one batch):
- Batch 3a — LLM: Copy domain modules (30 min)
  - Files: copy src/llm/... → services/llm-gateway/src/domain/...
  - Validate: files exist; service typecheck passes
  - Accept: no deep imports in copied files; no new TS errors

Acceptance criteria:
- [ ] New plan file exists with ~51 clearly-labeled batches
- [ ] Every batch limited to ≤45 min, ≤10 files
- [ ] Each batch has validations and acceptance criteria
- [ ] Monolith unaffected when flags OFF

Rollback:
- If any batch looks >45 min, split it further; do not proceed.

---

## 3) Update AGENTS.md (Refactoring Guidance) — via PR

Deliverables:
- Pull Request updating AGENTS.md with:
  - Microservices Refactoring Guidelines
  - Batch Execution Protocol
  - Error Recovery Procedures

What to do:
- Prepare a patch (no direct write; protected by CODEOWNERS):
  - Service extraction rules (copy/fix imports/routes/deps/test)
  - Proxy pattern with feature flag guard
  - Validation sequence after each batch (lint, typecheck, tests, contract:check)
  - Strict batch limits and prohibited actions
  - Rollback triggers and progress tracking guidance

Acceptance criteria:
- [ ] PR opened and linked in docs/10_201025_todays_status/AGENTS_update_LINK.md
- [ ] AGENTS.md changes reviewed by CODEOWNERS
- [ ] No contradictions with ai-stack.json or CDI rules

Rollback:
- If PR is rejected, incorporate feedback and resubmit.

---

## 4) Publish a Dependency Matrix

Deliverables:
- docs/10_201025_todays_status/07_refactor_dependency_matrix.md

What to do:
- Document dependencies among batches to enable safe parallelization.

Sample format:
| Batch | Depends On | Can Run In Parallel | Blocks |
|-------|------------|---------------------|--------|
| 0 (Discovery) | None | N/A | All others |
| 1a (Validation scripts – services) | 0 | 1b | - |
| 1b (Validation scripts – root) | 1a | - | 2a |
| 2a–2c (Discovery docs/.env) | 0 | 1a,1b | 3a |
| 3a–3e (LLM extraction) | 0,2 | 4a–4e | 7a |
| 4a–4e (Planning extraction) | 0,2 | 3a–3e,5a–5e | 10a |
| 5a–5e (Repair extraction) | 0,2 | 3a–4e | 11a |
| 7a–7e (LLM proxy) | 3e | 8a–13e (staggered) | - |

Acceptance criteria:
- [ ] Matrix file exists and includes all ~51 batches
- [ ] Parallelizable groups identified
- [ ] Linear blockers clear

Rollback:
- If contradictions discovered during execution, update matrix and pause parallel work until resolved.

---

## Global Validation (run before marking Priority 1 done)
- [ ] npm run -s lint
- [ ] npm run -s typecheck
- [ ] npm -s test (coverage ≥ 80% line / 75% branch)
- [ ] npm run -s contract:check
- [ ] sbom/provenance only when deps change (Priority 2 covers cadence)

Evidence to attach:
- Screenshots or snippets of discovery grep outputs
- Links to revised batches plan, dependency matrix, and AGENTS.md PR

Time budget: ~3 hours total.
