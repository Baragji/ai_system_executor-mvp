# 🚨 START HERE - READ THIS FIRST

**This repository is governed by [CONSTITUTION.md](CONSTITUTION.md).**

---

## ⚠️ CRITICAL: For AI Agents / Assistants

**BEFORE touching ANY code, READ THESE FILES IN ORDER:**

1. **[CONSTITUTION.md](CONSTITUTION.md)** ← The supreme law (IMMUTABLE)
2. **[AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)** ← How to work here
3. **[.aidigest](.aidigest)** ← Machine-readable rules
4. **[docs/11_211025/delivery.md](docs/11_211025/delivery.md)** ← Enterprise skeleton

**If you violate the CONSTITUTION, your work will be rejected. No exceptions.**

---

## 🏛️ What This Repository Is

**An enterprise-grade autonomous software delivery platform.**

- ✅ **Enterprise from Line 1** (not "prototype then rebuild")
- ✅ **Microservices from Day 1** (not "monolith then refactor")
- ✅ **Battle-Tested Tools** (not custom implementations)
- ✅ **Contracts First** (OpenAPI + JSON Schema before code)
- ✅ **Evidence Always** (SBOM, SLSA, SARIF, tests, traces)
- ✅ **Binary Gates** (PASS or FAIL, no subjective)

---

## 🚫 What This Repository Is NOT

- ❌ A prototype
- ❌ A proof-of-concept
- ❌ A monolith
- ❌ A "move fast and break things" project
- ❌ A place for custom implementations of solved problems

---

## 📜 The Golden Rules

### Rule 1: Enterprise from Line 1

**Build the final architecture from the first line of code.**

Never:
- ❌ Build monolith with plan to "refactor to microservices later"
- ❌ Build prototype with plan to "rebuild properly later"
- ❌ Use placeholders/stubs with plan to "replace later"

Always:
- ✅ Build production architecture from day 1
- ✅ Use battle-tested tools from day 1
- ✅ If we'll need it later, build it now

### Rule 2: Use What Exists

**Don't write custom code for solved problems.**

Never:
- ❌ Custom LLM orchestration (use LangGraph)
- ❌ Custom HTTP clients (use got/axios)
- ❌ Custom loggers (use winston/pino)
- ❌ Custom retry logic (use p-retry)
- ❌ Custom message queues (use NATS)

Always:
- ✅ Search npm/GitHub first
- ✅ Use pre-approved technologies (see [CONSTITUTION.md](CONSTITUTION.md) Article III)
- ✅ Document why custom code is needed (if no library exists)

### Rule 3: Contracts First

**Define contracts before implementation.**

Never:
- ❌ Write code first, document later
- ❌ Break existing contracts
- ❌ Skip contract validation

Always:
- ✅ Create OpenAPI 3.1 spec first
- ✅ Define JSON Schema for messages
- ✅ Version schemas (v1, v2, never break existing)
- ✅ Use RFC 9457 for errors

### Rule 4: Evidence Always

**Generate evidence for every execution.**

Never:
- ❌ Skip SBOM generation ("we'll add later")
- ❌ Skip security scans ("we'll add later")
- ❌ Skip tests/coverage ("we'll add later")

Always:
- ✅ Generate SBOM (CycloneDX)
- ✅ Generate provenance (SLSA Level 3)
- ✅ Run security scans (Semgrep, CodeQL, Trivy)
- ✅ Run tests with ≥80% coverage
- ✅ Generate OpenTelemetry traces

### Rule 5: Binary Gates

**All gates are PASS or FAIL (no subjective evaluation).**

Never:
- ❌ "Looks good to me" (subjective)
- ❌ "Should be fine" (unverified)
- ❌ "We'll fix in production" (deferred)

Always:
- ✅ Binary decision (PASS or FAIL)
- ✅ Evidence-backed (SARIF, coverage report, etc.)
- ✅ Documented reason (if FAIL)

---

## 🚀 Quick Start (For Developers)

### 1. Read the Law

```bash
# The supreme law
cat CONSTITUTION.md

# How to work here
cat AI_INSTRUCTIONS.md
```

### 2. Set Up Environment

```bash
# Start infrastructure
cd ops/dev
docker compose up -d
cd ../..

# Install dependencies
pnpm install
```

### 3. Start Services

```bash
pnpm run dev:gateway       # Port 8080
pnpm run dev:orchestrator  # LangGraph orchestrator
pnpm run dev:runner        # Port 7014
```

### 4. Test the System

```bash
# Create execution
curl -X POST http://localhost:8080/executions \
  -H "Content-Type: application/json" \
  -d '{
    "userIntent": "Create a TODO app with tests",
    "budgetLimit": 100
  }'

# View traces
open http://localhost:3000  # Grafana (admin/password123)

# View artifacts
open http://localhost:9001  # MinIO (admin/password123)
```

---

## 📚 Documentation

### Essential Reading (In Order)

1. **[CONSTITUTION.md](CONSTITUTION.md)** - Supreme law (immutable)
2. **[AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)** - Workflow for AI agents
3. **[docs/11_211025/delivery.md](docs/11_211025/delivery.md)** - Enterprise skeleton
4. **[docs/09_191025_todays_status/New_repo_microservice_discussion/01_VISION_CHEAT_SHEET.md](docs/09_191025_todays_status/New_repo_microservice_discussion/01_VISION_CHEAT_SHEET.md)** - Vision

### Reference

- **Contracts:** `packages/contracts/openapi/` (OpenAPI specs)
- **Schemas:** `packages/contracts/schema/` (JSON Schema)
- **Service Template:** `services/runner-da/src/server.ts`

---

## ❓ Common Questions

### Q: Can I build a quick prototype first?

**A: NO.** Build the final architecture from line 1. See [CONSTITUTION.md](CONSTITUTION.md) Article I.

### Q: Can I use a custom LLM wrapper?

**A: NO.** Use LangGraph. See [CONSTITUTION.md](CONSTITUTION.md) Article III, Section 3.3.

### Q: Can I refactor this monolith to microservices later?

**A: NO.** We build microservices from day 1. See [CONSTITUTION.md](CONSTITUTION.md) Article II.

### Q: Can I skip tests for now and add them later?

**A: NO.** Tests (≥80% coverage) are required from day 1. See [CONSTITUTION.md](CONSTITUTION.md) Article V.

### Q: Can I defer evidence generation?

**A: NO.** Evidence (SBOM, SLSA, SARIF) is required from day 1. See [CONSTITUTION.md](CONSTITUTION.md) Article V.

### Q: What if I disagree with the CONSTITUTION?

**A: Read Article VIII (Amendment Process).** Amendments require owner approval and may not contradict core principles.

---

## 🆘 Getting Help

1. **Read [CONSTITUTION.md](CONSTITUTION.md)** (most questions answered here)
2. **Read [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)** (workflow explained)
3. **Check contracts** (`packages/contracts/`)
4. **Ask repository owner** (@yousefbaragji)

---

## ✅ Ready to Work?

**Checklist before writing code:**

- [ ] Read CONSTITUTION.md
- [ ] Read AI_INSTRUCTIONS.md
- [ ] Checked contracts (packages/contracts/)
- [ ] Searched for existing libraries
- [ ] Know which service I'm modifying
- [ ] Know which contracts I need to update
- [ ] Know what evidence I need to generate

**If all checked, proceed to [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) for workflow.**

---

**"Enterprise from Line 1. Always."**

🏛️ [CONSTITUTION.md](CONSTITUTION.md) | 🤖 [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) | 📋 [delivery.md](docs/11_211025/delivery.md)
