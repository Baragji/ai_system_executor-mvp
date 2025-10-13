# CDI Infrastructure - Quick Reference

> **What is this?** Contract-Driven Integration (CDI) files added for Phase A and beyond.
> **When added:** 2025-10-08
> **Last Updated:** 2025-10-13
> **Current Phase:** Phase 19/20 (Autonomous Transition - Trust Spine + LangGraph Foundation)

---

## 📋 New Files Overview

### Core Stack Control
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `ai-stack.json` | Defines allowed languages, frameworks, constraints | Prevents Python, enforces TypeScript-only |
| `.nvmrc` | Locks Node version to 20 | Prevents dependency drift across Node versions |

### Trust Spine (Phase 19 T0)
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `src/middleware/problemDetails.ts` | RFC 9457 problem details error responses | Standardized HTTP error format for observability |
| `src/telemetry/otel.ts` | OpenTelemetry bootstrap (env-gated) | GenAI span tracing for LLM/tool calls (when `OTEL_ENABLED=1`) |
| `src/telemetry/events.ts` | JSONL action log dual-write | SIEM-friendly audit logs (when `ACTION_LOG_JSONL=1`) |
| `scripts/generate-cyclonedx.js` | CycloneDX 1.6 SBOM generation | Supply chain compliance per ADR-019 |
| `scripts/generate-provenance.js` | SLSA v1.0 provenance | Build attestation per ADR-019 |
| `.automation/evidence/G2/` | Trust Spine evidence bundle | Stores SBOM, provenance, traces, logs, errors for Gate G2 |

### Anti-Drift Guardrails
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `.github/CODEOWNERS` | Protects critical files from unauthorized changes | Stack lock, workflows, schemas need approval |
| `.github/copilot-instructions.md` | AI agent instructions (discovery protocol) | Tells Copilot/Cursor how to work with this repo |

### Evidence & Validation
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `contracts/schemas/roadmap_phase.schema.json` | JSON Schema for validating phase contracts | Catches malformed contracts before execution |
| `scripts/validate-contract.js` | Runs contract validation | Called by `npm run contract:check` |
| `.github/workflows/cdi-validation.yml` | CI workflow for CDI checks | Validates contracts, generates SBOM, checks stack compliance |

### Developer Experience
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `.github/pull_request_template.md` | PR template with evidence checklist | Forces discovery notes and evidence artifacts |

### Contracts
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json` | **Phase 19 (Active)**: Trust Spine + LangGraph foundation | Governs CycloneDX/SLSA, OTel, RFC 9457, orchestrator infrastructure, Gate G2 |
| `contracts/Roadmap_execution/20_phase20_langgraph_executions_contract.json` | **Phase 20 (Complete)**: Executions endpoint | LangGraph async execution tracking via GET /api/executions/:id |
| `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json` | Phase A contract with CDI discovery phase | Detailed instructions for UI baseline wins (WA1-WA3) |
| `contracts/Roadmap_execution/16_phaseA_accessibility_pause_contract.json` | Phase A win set for accessibility + pause clarifications | Governs fixes for link contrast, shared clarification helper, multi-cycle pause handling, and snapshot refresh |

---

## 🔍 Quick File Finder

**Need to know what stack is allowed?**  
→ `ai-stack.json`

**Need to understand the discovery protocol?**  
→ `.github/copilot-instructions.md`

**Need to see what files are protected?**  
→ `.github/CODEOWNERS`

**Need to validate a contract?**  
→ `npm run contract:check` (uses `scripts/validate-contract.js`)

**Need to see current phase contract?**
→ `contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json`

**Need to understand CI validation?**
→ `.github/workflows/cdi-validation.yml`

**Need problem details error types?**
→ `docs/api/problem_types.md`

---

## 🚩 Feature Flag Workflow (Phase 19+)

Phase 19 introduces feature-flagged capabilities for safe rollout:

### Testing LangGraph Runtime
```bash
# Enable LangGraph orchestrator
export AGENTS_RUNTIME=langgraph
npm run dev

# Test executions endpoint
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Build hello world"}' \
  -v  # Check for 202 + Location header

# Poll execution status
curl http://localhost:3000/api/executions/{id}
```

### Testing OpenTelemetry
```bash
# Enable OTel tracing (requires collector running)
export OTEL_ENABLED=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
npm run dev
```

### Testing Action Logs
```bash
# Enable JSONL action log dual-write
export ACTION_LOG_JSONL=1
npm run dev
# Check: .automation/actions.jsonl should be created
```

### Testing RFC 9457 Errors
```bash
# Enabled by default in dev/test
npm run dev
# Or force-enable in prod:
export PROBLEM_DETAILS_ENABLED=1
```

### Rollback
```bash
unset AGENTS_RUNTIME  # Returns to StepQueue
unset OTEL_ENABLED    # Disables telemetry
unset ACTION_LOG_JSONL  # Disables action logs
# Or set to explicit defaults:
export AGENTS_RUNTIME=stepqueue
```

---

## 🎯 What Each System Does

### Stack Compliance System
**Files:** `ai-stack.json`, `.nvmrc`, `.github/CODEOWNERS`  
**Purpose:** Prevent stack drift (no Python, TypeScript only, Node 20)  
**Enforcement:** CI checks + CODEOWNERS approval for protected files

### Discovery Protocol System
**Files:** `.github/copilot-instructions.md`, phase contracts  
**Purpose:** Map integration points BEFORE making changes  
**Output:** `.automation/phase*_discovery.json` and `.md` files

### Evidence Collection System
**Files:** CI workflow, package.json scripts  
**Purpose:** Prove code works (tests pass, SBOM generated, schema valid)  
**Artifacts:** Test outputs, SBOM, contract validation results

### Contract Validation System
**Files:** `roadmap_phase.schema.json`, `validate-contract.js`  
**Purpose:** Machine-verify contracts match required structure  
**Command:** `npm run contract:check`

---

## 📦 npm Scripts

```bash
# Validation (Required before merge)
npm run lint              # ESLint - must exit 0, no warnings
npm run typecheck         # TypeScript - must exit 0
npm test                  # Vitest - must exit 0, coverage thresholds met
npm run contract:check    # Contract schema validation - must exit 0

# SBOM & Provenance (Phase 19+)
npm run sbom              # Generate SPDX SBOM → sbom.spdx.json
npm run sbom:cyclonedx    # Generate CycloneDX SBOM → sbom.cdx.json
npm run sbom:all          # Generate both SPDX + CycloneDX
npm run provenance        # Generate SLSA v1.0 provenance → provenance.intoto.jsonl

# Combined Validation
npm run validate:all      # Run lint + typecheck + test + contract:check
```

---

## 🚦 CI Checks (New)

When you create a PR, these new checks run automatically:

1. **Contract Schema Validation** - Ensures contract JSON is valid
2. **SBOM Generation** - Creates dependency manifest
3. **Stack Compliance** - Checks for Python files, verifies /public structure
4. **Evidence Artifacts** - Looks for discovery notes (if applicable)

All must pass ✅ before merge is allowed.

---

## 🗂️ Directory Structure (Phase 19+ CDI Files)

```
repo-root/
├── ai-stack.json                                       # Stack lock file
├── .nvmrc                                              # Node version (20)
├── CDI_INFRASTRUCTURE.md                               # This file
├── AGENTS.md                                           # AI agent instructions (Phase 19 updated)
│
├── .github/
│   ├── CODEOWNERS                                      # Protected files list
│   ├── copilot-instructions.md                         # AI agent instructions
│   ├── pull_request_template.md                        # PR template with evidence checklist
│   └── workflows/
│       └── cdi-validation.yml                          # CDI CI checks
│
├── contracts/
│   ├── README.md                                       # Contract naming standard (Phase 19)
│   ├── schemas/
│   │   └── roadmap_phase.schema.json                   # Contract JSON Schema
│   └── Roadmap_execution/
│       ├── 19_phase19_autonomous_transition_contract.json  # ⭐ Phase 19 (Active)
│       ├── 20_phase20_langgraph_executions_contract.json   # ⭐ Phase 20 (Complete)
│       └── [01-18 legacy contracts...]                 # Historical contracts
│
├── docs/
│   └── api/
│       └── problem_types.md                            # RFC 9457 error types (Phase 19)
│
├── src/
│   ├── middleware/
│   │   └── problemDetails.ts                           # RFC 9457 helpers (needs Phase 19 fixes)
│   ├── telemetry/
│   │   ├── otel.ts                                     # OTel bootstrap (placeholder, Phase 19 T0)
│   │   └── events.ts                                   # Event logging (needs JSONL dual-write)
│   └── orchestrator/
│       ├── adapter.ts                                  # Feature-flagged LangGraph adapter
│       ├── graph.ts                                    # LangGraph stub runtime
│       └── executionsStore.ts                          # Executions tracking (Phase 20 complete)
│
├── scripts/
│   ├── validate-contract.js                            # Contract validator
│   ├── generate-cyclonedx.js                           # ⏳ To be created (Phase 19 T0)
│   └── generate-provenance.js                          # ⏳ To be created (Phase 19 T0)
│
└── .automation/
    ├── GATES_LEDGER.md                                 # ⏳ To be created (Phase 19 T0)
    ├── evidence/
    │   └── G2/                                         # ⏳ To be created (Phase 19 T0)
    │       ├── sbom.cdx.json                           # CycloneDX SBOM
    │       ├── provenance.intoto.jsonl                 # SLSA provenance
    │       ├── otel_trace_export.json                  # OTel trace sample
    │       ├── actions.jsonl                           # JSONL action log sample
    │       └── errors_rfc9457.jsonl                    # RFC 9457 error samples
    └── phase19_20_implementation_summary.md            # ⭐ Trust Spine implementation guide

⭐ = Completed in this session
⏳ = Pending implementation (Phase 19 T0)
```

---

## ⚡ Quick Start (Phase 19)

**To validate current state:**

```bash
# 1. Switch to Node 20
nvm use 20

# 2. Install dependencies (if not done)
npm install

# 3. Validate contracts (Phase 19/20 contracts exist)
npm run contract:check
# Expected: ✅ All contracts are valid!

# 4. Test SBOM generation (SPDX available, CycloneDX pending Phase 19 T0)
npm run sbom
# Expected: Creates sbom.spdx.json

# 5. Run all validation
npm run validate:all
# Expected: All checks pass
```

**To begin Phase 19 Trust Spine implementation:**

→ See: `.automation/phase19_20_implementation_summary.md` (step-by-step guide)
→ Contract: `contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json`

**To test Phase 20 executions endpoint:**

```bash
# Start server with LangGraph runtime
export AGENTS_RUNTIME=langgraph
npm run dev

# In another terminal:
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' \
  -v  # Check for 202 + Location header
```

---

## 🔗 Related Documentation

### Phase 19+ (Current)
- **Phase 19 Contract:** `contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json`
- **Phase 20 Contract:** `contracts/Roadmap_execution/20_phase20_langgraph_executions_contract.json`
- **Implementation Guide:** `.automation/phase19_20_implementation_summary.md`
- **Strategy:** `docs/Goal_&_Vision_inspirational_only/03_final_decisions/phase19_autonomous_transition_strategy.md`
- **ADR-019:** `docs/Goal_&_Vision_inspirational_only/03_final_decisions/RA_Deliveries/ADR-019_LangGraph_TS_Orchestrator_2025-10-12.md`
- **Contract Naming:** `contracts/README.md`
- **Problem Types:** `docs/api/problem_types.md`

### Historical
- **Phase A Contracts:** `contracts/Roadmap_execution/11_*.json`, `16_*.json`
- **Research Findings:** `docs/Planning_roadmap_signature/04_ai_integration_pattern.md`
- **Trust Engine Roadmap:** `docs/Planning_roadmap_signature/02_trust_engine_roadmap.md`

---

## 📝 Current Status

- **Active Phase:** Phase 19 (Trust Spine + LangGraph Foundation) + Phase 20 (Complete)
- **Completed This Session:**
  - ✅ Phase 19/20 contracts created and validated
  - ✅ Governance docs updated (AGENTS.md, CDI_INFRASTRUCTURE.md)
  - ✅ Contract naming standard documented
  - ✅ RFC 9457 API documentation complete
  - ✅ Implementation guide created

- **Next Milestone:** Phase 19 T0 (Trust Spine Implementation)
  - ⏳ CycloneDX SBOM generation
  - ⏳ SLSA provenance generation
  - ⏳ OpenTelemetry GenAI spans
  - ⏳ JSONL action log dual-write
  - ⏳ RFC 9457 corrections
  - ⏳ Evidence bundle collection (Gate G2)

- **Execution History:** Contracts 01-18 complete (Phases 0-4, 4B1-4B4, A, B, E)
- **CDI Pattern:** Discovery → Implementation → Evidence → Gates
- **Philosophy:** Quality over speed. Ship perfect or never.

---

**Last Updated:** 2025-10-13
**Status:** Phase 19/20 contracts active; Trust Spine implementation pending (see `.automation/phase19_20_implementation_summary.md`)
