# CDI Infrastructure - Quick Reference

> **What is this?** Contract-Driven Integration (CDI) files added for Phase A and beyond.  
> **When added:** 2025-10-08  
> **Current Phase:** A (UI Baseline Fixes)

---

## 📋 New Files Overview

### Core Stack Control
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `ai-stack.json` | Defines allowed languages, frameworks, constraints | Prevents Python, enforces TypeScript-only |
| `.nvmrc` | Locks Node version to 20 | Prevents dependency drift across Node versions |

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
| `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json` | Phase A contract with CDI discovery phase | Detailed instructions for UI baseline wins (WA1-WA3) |

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

**Need to see Phase A implementation plan?**  
→ `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json`

**Need to understand CI validation?**  
→ `.github/workflows/cdi-validation.yml`

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

## 📦 New npm Scripts

```bash
npm run contract:check    # Validate contracts against schema
npm run sbom              # Generate SBOM (Software Bill of Materials)
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

## 🗂️ Directory Structure (New Files Only)

```
repo-root/
├── ai-stack.json                          # Stack lock file
├── .nvmrc                                 # Node version (20)
├── CDI_INFRASTRUCTURE.md                  # This file
│
├── .github/
│   ├── CODEOWNERS                         # Protected files list
│   ├── copilot-instructions.md            # AI agent instructions
│   ├── pull_request_template.md           # PR template with evidence checklist
│   └── workflows/
│       └── cdi-validation.yml             # CDI CI checks
│
├── contracts/
│   ├── schemas/
│   │   └── roadmap_phase.schema.json      # Contract JSON Schema
│   └── Roadmap_execution/
│       └── 11_phaseA_contract_enhanced.json  # Phase A contract (CDI)
│
└── scripts/
    └── validate-contract.js               # Contract validator
```

---

## ⚡ Quick Start

**To validate everything is working:**

```bash
# 1. Switch to Node 20
nvm use 20

# 2. Install dependencies (if not done)
npm install

# 3. Test contract validation
npm run contract:check
# Expected: ✅ All contracts are valid!

# 4. Test SBOM generation
npm run sbom
# Expected: Creates sbom.spdx.json

# 5. Run all validation
npm run validate:all
# Expected: All checks pass
```

**Note:** If you see "10 vulnerabilities (4 low, 6 moderate)" after `npm install`, this is from dev dependencies (Playwright, etc.) and doesn't affect Phase A execution. Can be addressed later with `npm audit fix`.

**To start Phase A execution:**

→ See: `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json`

---

## 🔗 Related Documentation

- **Research Findings:** `docs/Planning_roadmap_signature/04_ai_integration_pattern.md`
- **Trust Engine Roadmap:** `docs/Planning_roadmap_signature/02_trust_engine_roadmap.md`
- **Session Summary:** See uploaded documents for full context

---

## 📝 Notes

- **Execution History:** Contracts 01-10 already complete (Phases 0-4)
- **Current Phase:** A (UI Baseline Fixes) - Contract 11
- **Next Phase:** B (Trust Engine - auto-test generation, security scanning, confidence scores)
- **CDI Pattern:** Discovery → Implementation → Evidence → Gates
- **Philosophy:** Quality over speed. Ship perfect or never.

---

**Last Updated:** 2025-10-08  
**Status:** Ready for Phase A execution
