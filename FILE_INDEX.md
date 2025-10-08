# File Index - What's Where

Quick map of the repo structure. Numbers = importance (1=critical).

## [1] Stack & Config
```
ai-stack.json              → What languages/frameworks are allowed
.nvmrc                     → Node version lock (20)
package.json               → Dependencies + npm scripts
tsconfig.json              → TypeScript config
vitest.config.ts           → Test config
eslint.config.js           → Linting rules
```

## [1] Contracts (Implementation Plans)
```
contracts/Roadmap_execution/
  11_phaseA_contract_enhanced.json  → ⏳ CURRENT: Phase A (UI baseline)
  11_phaseA_contract.json           → Original Phase A (pre-CDI)
  
  01-10_*.json                      → ✅ COMPLETE (past executions)
                                       01: Remediation
                                       02-05: Phase 2a-c
                                       06-07: Phase 3a-b  
                                       08-09: Phase 4a-b
                                       10: Core capabilities doc
  
contracts/schemas/
  roadmap_phase.schema.json         → Contract validation schema
  *.schema.json                     → Other schemas (executor, tasks, etc.)
```

## [1] GitHub Protection
```
.github/CODEOWNERS                     → Protected files (need approval)
.github/copilot-instructions.md        → AI agent instructions
.github/pull_request_template.md       → PR template
.github/workflows/
  ci.yml                               → Main CI (lint/test/typecheck)
  cdi-validation.yml                   → CDI checks (contract/SBOM/stack)
  ui-validation.yml                    → UI tests
```

## [1] Source Code
```
src/
  server.ts                   → Express server
  planning/                   → Task decomposition
  runner/                     → Sandbox execution
  clarification/              → Interactive Q&A
  repair/                     → Multi-turn repair
```

## [2] Frontend
```
public/
  index.html                  → Main UI
  script.js                   → Frontend logic
  styles.css                  → Styling
```

## [2] Scripts & Tools
```
scripts/
  validate-contract.js        → Contract schema validation
  run-lhci.mjs               → Lighthouse CI
  generate-ui-compliance.mjs → UI validation
```

## [2] Tests
```
tests/                        → Backend tests
ui-tests/                     → Playwright UI tests
coverage/                     → Coverage reports
```

## [3] Documentation
```
docs/Planning_roadmap_signature/
  01_signature_moments_research_output.md  → Trust Engine research
  02_trust_engine_roadmap.md               → Phase A-E roadmap
  04_ai_integration_pattern.md             → CDI pattern (research)

CDI_INFRASTRUCTURE.md         → Quick reference (this folder)
README.md                     → Project overview
ROADMAP.md                    → High-level plan
```

## [3] Automation & Output
```
.automation/                  → Execution traces, discovery notes, evidence
output/                       → Generated projects
.telemetry/                   → Metrics
```

## [4] Config/Meta
```
.gitignore
.env / .env.example
Makefile
docker/
```

---

## Quick Finder

**I want to...**

- **See what Phase A does** → `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json`
- **Know what's allowed/forbidden** → `ai-stack.json`
- **Understand AI instructions** → `.github/copilot-instructions.md`
- **See what files are protected** → `.github/CODEOWNERS`
- **Validate a contract** → `npm run contract:check`
- **See CI checks** → `.github/workflows/cdi-validation.yml`
- **Understand the research** → `docs/Planning_roadmap_signature/04_ai_integration_pattern.md`

---

**Legend:**
- [1] = Essential (read these first)
- [2] = Important (read when working on that area)
- [3] = Reference (read as needed)
- [4] = Infrastructure (rarely touch)
