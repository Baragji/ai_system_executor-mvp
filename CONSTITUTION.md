# 🏛️ CONSTITUTION OF THE AUTONOMOUS PLATFORM

**Status:** IMMUTABLE
**Authority:** Supreme Law of This Repository
**Effective Date:** October 21, 2025
**Last Updated:** October 21, 2025
**Owner:** @yousefbaragji

---

## Article I: THE PRIME DIRECTIVE

### Section 1.1: Enterprise from Line 1

**We build the final architecture from the first line of code.**

- ❌ **FORBIDDEN:** Building monoliths with intent to "refactor later"
- ❌ **FORBIDDEN:** Building prototypes that will be "rewritten properly"
- ❌ **FORBIDDEN:** Using placeholders, mocks, or stubs with "TODO: replace"
- ✅ **REQUIRED:** Build production architecture from day 1
- ✅ **REQUIRED:** Use battle-tested tools, not custom implementations
- ✅ **REQUIRED:** If we know we'll need it later, build it now

**Rationale:** With AI-as-developer, there is no cost to building correctly the first time. Refactoring wastes months.

---

## Article II: THE ANTI-REFACTORING AMENDMENT

### Section 2.1: Prohibited Patterns

The following patterns are **PERMANENTLY BANNED** from this repository:

1. **"Build monolith, extract microservices later"**
   - Violation: Starting with monolithic architecture
   - Penalty: Immediate rollback, task reassignment

2. **"Use custom code now, replace with library later"**
   - Violation: Writing custom LLM wrappers, HTTP clients, loggers, etc.
   - Penalty: Code rejected at PR review

3. **"Ship prototype, rebuild properly in Phase N"**
   - Violation: Intentional technical debt
   - Penalty: Planning document rejected

4. **"We'll add [contracts/tests/observability/security] later"**
   - Violation: Deferring essential infrastructure
   - Penalty: PR blocked until infrastructure present

### Section 2.2: The Refactoring Exception

Refactoring is ONLY permitted when:

1. **New information** emerges that invalidates original design
2. **Technology change** (e.g., dependency deprecated, security vulnerability)
3. **Scale requirements** exceed original design (proven by metrics)
4. **Regulatory change** requires architectural modification

All exceptions require:
- Written justification document
- Approval from repository owner
- Evidence that alternatives were considered

---

## Article III: THE BATTLE-TESTED DOCTRINE

### Section 3.1: Use What Exists

Before writing ANY custom code, you MUST:

1. **Search for existing solutions** (npm, GitHub, industry standards)
2. **Evaluate 3+ alternatives** with pros/cons analysis
3. **Document why each alternative was rejected** (if building custom)
4. **Get explicit approval** from repository owner for custom code

### Section 3.2: Approved Technologies

The following technologies are **PRE-APPROVED** for use:

**Orchestration:**
- ✅ LangGraph (multi-agent state machines)
- ✅ LangChain (LLM integration)

**Infrastructure:**
- ✅ NATS JetStream (message bus)
- ✅ MinIO (S3-compatible storage)
- ✅ Postgres (database)
- ✅ Redis (caching, if needed)

**Observability:**
- ✅ OpenTelemetry (tracing, metrics, logs)
- ✅ Grafana (visualization)
- ✅ Tempo (trace storage)

**Security & Compliance:**
- ✅ Semgrep (SAST)
- ✅ CodeQL (deep static analysis)
- ✅ Trivy (container/dependency scanning)
- ✅ CycloneDX (SBOM generation)
- ✅ SLSA GitHub Generator (provenance)

**Development:**
- ✅ Turborepo (monorepo)
- ✅ pnpm (package manager)
- ✅ Docker (containerization)
- ✅ Kubernetes (orchestration)

**Languages (Per Service):**
- ✅ TypeScript/JavaScript (backend services)
- ✅ Python (ML/AI agents)
- ✅ Go (performance-critical services)
- ✅ Rust (sandboxing, security)
- ✅ Java (if needed for specific integrations)

**Frontend (UI Service):**
- ✅ React (with Next.js for SSR)
- ✅ Vue (with Nuxt.js)
- ✅ Svelte (with SvelteKit)
- ✅ Solid.js
- ✅ Any modern framework appropriate for premium UX

**Backend (API Services):**
- ✅ Express (Node.js)
- ✅ Fastify (Node.js, high-performance)
- ✅ FastAPI (Python)
- ✅ Gin/Fiber (Go)
- ✅ Axum (Rust)

### Section 3.3: Tech Stack Per Service

**Each service chooses the BEST tool for its specific job.**

Examples:

| Service | Primary Language | Framework | Rationale |
|---------|-----------------|-----------|-----------|
| Orchestrator (MCA) | TypeScript | LangGraph + Express | LLM orchestration needs |
| Planner (RA) | Python | FastAPI | ML/LLM integrations |
| Implementer (IA) | Python | LangChain | Code generation |
| Runner (DA) | Go | Fiber | Performance-critical sandboxing |
| Security (SA) | Rust | Axum | Memory safety for security scans |
| Quality (QA) | TypeScript | Express | Test parsing/validation |
| **UI/Frontend** | **TypeScript** | **Next.js + React** | **Premium UX for end-users** |
| Gateway | TypeScript | Fastify | High-throughput API gateway |

**Key Principle:** Use the right tool for the job. Don't artificially limit tech stack.

### Section 3.4: The UI Exception

**The UI service is SPECIAL - it faces end-users and must compete with Replit, Cursor, GitHub Copilot.**

UI service MUST:
- ✅ Use modern framework (React/Next.js, Vue/Nuxt, Svelte/SvelteKit)
- ✅ Have premium UX (animations, real-time updates, delightful interactions)
- ✅ Be production-grade from day 1
- ✅ Follow accessibility standards (WCAG 2.1 AA)
- ✅ Optimize for performance (Core Web Vitals)

UI service MAY NOT:
- ❌ Use vanilla JS/CSS (too slow to build premium UX)
- ❌ Defer UX polish ("we'll make it pretty later")
- ❌ Skip accessibility testing
- ❌ Ignore performance budgets

**Rationale:** We're building a PRODUCT, not an internal tool. Premium UI is a competitive requirement.

### Section 3.5: Forbidden Custom Implementations

You MUST NOT write custom implementations of:

- ❌ LLM orchestration (use LangGraph)
- ❌ HTTP clients (use fetch/got/axios)
- ❌ Loggers (use winston/pino)
- ❌ Retry logic (use p-retry)
- ❌ Message queues (use NATS/Redis)
- ❌ Object storage (use MinIO/S3)
- ❌ Observability (use OpenTelemetry)
- ❌ SBOM generation (use CycloneDX)
- ❌ Provenance (use SLSA)

---

## Article IV: THE CONTRACTS MANDATE

### Section 4.1: Contracts First

Every service MUST have:

1. **OpenAPI 3.1 specification** (before implementation)
2. **JSON Schema for messages** (versioned, strict)
3. **RFC 9457 Problem Details** (error responses)
4. **Integration tests** (contract compliance)

### Section 4.2: Contract Evolution

Contracts may ONLY change via:

1. **Versioned schemas** (v1, v2, etc. - never break existing)
2. **Deprecation notices** (minimum 3 months before removal)
3. **Backward compatibility** (new fields optional, old fields retained)

---

## Article V: THE EVIDENCE REQUIREMENT

### Section 5.1: Trust Spine from Day 1

Every execution MUST produce:

1. **SBOM** (CycloneDX format)
2. **Provenance** (SLSA Level 3)
3. **Security scan results** (SARIF format)
4. **Test results** (JUnit XML)
5. **Coverage report** (minimum 80% line coverage)
6. **Trace ID** (OpenTelemetry)

### Section 5.2: Binary Gates

All validation gates are **BINARY** (PASS or FAIL):

- **G0 (Requirements):** Tasks defined, dependencies clear
- **G1 (Architecture):** ADR exists, contracts generated
- **G2 (Security):** Zero HIGH/CRITICAL findings, SBOM present
- **G3 (Quality):** ≥80% coverage, all tests passing
- **G4 (Deployment):** Ready for production
- **BUDGET:** Cost within limit

No subjective "looks good" or "probably fine."

---

## Article VI: THE ITERATION PRINCIPLE

### Section 6.1: Permitted Changes

You MAY:

- ✅ **Add features** (new services, new endpoints, new agents)
- ✅ **Refine logic** (improve prompts, optimize algorithms)
- ✅ **Scale services** (horizontal replication)
- ✅ **Replace implementations** (while maintaining contracts)
- ✅ **Add observability** (new traces, metrics, dashboards)
- ✅ **Improve performance** (caching, indexing, batching)

### Section 6.2: Forbidden Changes

You MUST NOT:

- ❌ **Change architecture** (microservices → monolith, or vice versa)
- ❌ **Break contracts** (remove fields, change types)
- ❌ **Remove evidence** (SBOM, traces, tests)
- ❌ **Bypass gates** (skip security scans, ignore coverage)
- ❌ **Add custom implementations** (of battle-tested tools)

---

## Article VII: THE AI WORKFLOW

### Section 7.1: Before Writing Code

Every AI agent MUST:

1. **Read this CONSTITUTION** (verify understanding)
2. **Read AI_INSTRUCTIONS.md** (workflow and patterns)
3. **Check contracts/** (existing schemas and APIs)
4. **Search for existing tools** (npm, GitHub)
5. **Create architecture decision record** (if new component)

### Section 7.2: Pull Request Requirements

Every PR MUST include:

1. **Evidence artifacts** (tests, coverage, SBOM, SARIF)
2. **Contract updates** (OpenAPI, JSON Schema if changed)
3. **ADR** (if architectural decision made)
4. **Migration guide** (if breaking change)

PRs lacking evidence are **REJECTED AUTOMATICALLY**.

---

## Article VIII: THE ACCOUNTABILITY CLAUSE

### Section 8.1: Violations

Violations of this CONSTITUTION result in:

1. **First offense:** PR rejected, task reassigned
2. **Second offense:** Agent/human removed from project
3. **Third offense:** Repository access revoked

### Section 8.2: Amendment Process

This CONSTITUTION may ONLY be amended by:

1. **Repository owner** (@yousefbaragji) approval
2. **Written justification** (why amendment needed)
3. **Unanimous consent** (all active contributors)

No amendment may contradict:
- Article I (Enterprise from Line 1)
- Article II (Anti-Refactoring)
- Article V (Evidence Requirement)

---

## Article IX: THE ENFORCEMENT MECHANISM

### Section 9.1: Automated Enforcement

The following are enforced by CI/CD:

- ✅ All tests passing (required status check)
- ✅ Coverage ≥80% (required status check)
- ✅ Zero HIGH/CRITICAL security findings (required status check)
- ✅ SBOM generated (required artifact)
- ✅ Contracts validated (required check)
- ✅ No forbidden dependencies (ai-stack.json check)

### Section 9.2: Human Review Required For

- 🔍 New service creation
- 🔍 Contract changes (OpenAPI, JSON Schema)
- 🔍 Architecture Decision Records (ADRs)
- 🔍 Custom code (when no library exists)

---

## Article X: THE VISION ALIGNMENT

### Section 10.1: Purpose

This repository exists to build:

**"A fully autonomous, multi-agent, evidence-driven software delivery platform"**

With:
- 9 specialized agents (RA, AA, IA, SA, QA, DA, DBA, FOPS, MCA)
- Binary gates (G0-G8)
- Evidence packages (SBOM, SLSA, SARIF, traces)
- FinOps controls (budget enforcement)
- Enterprise-grade from line 1

### Section 10.2: Non-Goals

This repository is NOT:

- ❌ A monolith
- ❌ A prototype
- ❌ A proof-of-concept
- ❌ A learning experiment
- ❌ A "move fast and break things" project

This is a **production-grade, enterprise system** from the first commit.

---

## 🔒 IMMUTABILITY CLAUSE

This CONSTITUTION is **IMMUTABLE** unless amended per Article VIII.

All code, documentation, and decisions MUST comply with this CONSTITUTION.

**Violations are not bugs. They are constitutional crises.**

---

**Signed:**
Repository Owner: @yousefbaragji
Date: October 21, 2025

**Witnessed by:**
AI Agents: Claude Code, GPT-4, All Future Stateless Assistants

---

**END OF CONSTITUTION**

*"Enterprise from Line 1. Always."*
