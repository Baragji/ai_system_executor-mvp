# Tech Stack Clarification - Microservices Architecture

**Date:** October 21, 2025
**Issue:** Constitution initially forbade React, Vue, Go, Rust (inherited from monolith constraints)
**Resolution:** Updated to allow appropriate tech stack per service

---

## ❌ The Problem

The initial `.aidigest` and `CONSTITUTION.md` inherited constraints from the old monolith's `ai-stack.json`:

```yaml
FORBIDDEN_FRAMEWORKS=react,vue,angular,svelte
FORBIDDEN_LANGUAGES=ruby,php,java,go,rust
```

**This was WRONG for microservices architecture because:**

1. **Different services have different needs** (UI ≠ API ≠ Security ≠ Runner)
2. **We're building a PRODUCT that competes with Replit, Cursor, GitHub Copilot**
3. **Premium UI requires modern frameworks** (React, Next.js, etc.)
4. **Performance-critical services need Go/Rust** (runner sandboxing, security scanning)

---

## ✅ The Solution

### New Principle: Best Tool for the Job (Per Service)

**Each microservice chooses the appropriate tech stack for its specific requirements.**

| Service | Tech Stack | Rationale |
|---------|------------|-----------|
| **UI/Frontend** | TypeScript + Next.js + React | Premium UX, real-time updates, compete with Replit/Cursor |
| **Orchestrator (MCA)** | TypeScript + LangGraph | LLM orchestration, state machines |
| **Planner (RA)** | Python + FastAPI | ML/LLM integrations, ecosystem |
| **Implementer (IA)** | Python + LangChain | Code generation, LLM tools |
| **Runner (DA)** | Go + Fiber | Performance-critical sandboxing, isolation |
| **Security (SA)** | Rust + Axum | Memory safety for security scanning |
| **Quality (QA)** | TypeScript + Express | Test parsing, coverage validation |
| **FinOps (FOPS)** | TypeScript + Express | Cost tracking, budget enforcement |
| **DB Layer (DBA)** | TypeScript + Postgres | Database operations, migrations |
| **Gateway** | TypeScript + Fastify | High-throughput API gateway |

---

## 🎯 The UI Service is Special

**The UI faces end-users and must compete with premium products.**

### UI Requirements (from CONSTITUTION.md Article III, Section 3.4)

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

---

## 📋 Updated Architecture (10 Services)

```
autonomous-platform/
├─ apps/
│  ├─ gateway/              # TypeScript + Fastify
│  └─ mca-orchestrator/     # TypeScript + LangGraph
├─ services/
│  ├─ planner-ra/           # Python + FastAPI
│  ├─ architect-aa/         # Python + LangChain
│  ├─ implementer-ia/       # Python + LangChain
│  ├─ runner-da/            # Go + Fiber (sandboxing)
│  ├─ security-sa/          # Rust + Axum (memory safety)
│  ├─ quality-qa/           # TypeScript + Express
│  ├─ finops-fops/          # TypeScript + Express
│  ├─ db-layer-dba/         # TypeScript + Postgres
│  └─ ui-frontend/          # TypeScript + Next.js + React ⭐
```

---

## 🔒 What's Still Forbidden

### Forbidden: Custom Implementations of Solved Problems

You MUST NOT write custom:
- ❌ LLM orchestration (use LangGraph)
- ❌ HTTP clients (use fetch/got/axios)
- ❌ Loggers (use winston/pino)
- ❌ Retry logic (use p-retry)
- ❌ Message queues (use NATS/Redis)
- ❌ Object storage (use MinIO/S3)
- ❌ Observability (use OpenTelemetry)
- ❌ SBOM generation (use CycloneDX)
- ❌ Provenance (use SLSA)

### Forbidden: Mixing Tech Stacks Within a Service

**Each service should be consistent internally:**

❌ **BAD:**
```
services/runner-da/
├─ src/
│  ├─ server.go        # Go
│  └─ utils.py         # Python (mixed!)
```

✅ **GOOD:**
```
services/runner-da/
├─ src/
│  ├─ server.go        # Go only
│  └─ utils.go         # Go only
```

---

## 💡 Why Microservices Allow This

**Monolith constraints:**
- Single tech stack for entire app
- Upgrade = rewrite everything
- Performance bottleneck = slow everywhere

**Microservices freedom:**
- Each service optimized for its job
- Upgrade one service without touching others
- Performance bottleneck = scale/rewrite one service

**Example:**
```
Runner service (Go):
- Needs: High performance, low latency, memory safety
- Choice: Go (compiled, fast, goroutines)
- Alternative: TypeScript would be 10x slower

UI service (Next.js):
- Needs: Rich UX, real-time updates, SEO
- Choice: Next.js (React SSR, API routes)
- Alternative: Vanilla JS would take 10x longer to build
```

---

## 📝 Files Updated

1. **`.aidigest`** - Changed FORBIDDEN_FRAMEWORKS/LANGUAGES to ALLOWED
2. **`CONSTITUTION.md`** - Added Article III, Sections 3.3-3.4 (tech stack per service, UI exception)
3. **`docs/11_211025/delivery.md`** - Added tech stack notes to service list, added ui-frontend service

---

## ✅ Next Steps

### For UI Service (Week 2-3)

```bash
# Create UI service
mkdir -p services/ui-frontend

# Initialize Next.js
cd services/ui-frontend
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# Add real-time features
pnpm add @tanstack/react-query socket.io-client zustand

# Add premium UX
pnpm add framer-motion @headlessui/react @heroicons/react

# Add accessibility
pnpm add @axe-core/react

# Add performance monitoring
pnpm add @vercel/analytics web-vitals
```

### Design Goals

**Compete with:**
- Replit (collaborative coding, real-time terminal)
- Cursor (AI-first UX, inline suggestions)
- GitHub Copilot Workspace (multi-file context, project view)

**Key features:**
- Real-time code generation progress
- Interactive agent chat
- Visual evidence timeline (SBOM, SARIF, tests)
- Cost tracking dashboard (FinOps)
- Execution replay (debug mode)

---

## 🏛️ Constitutional Alignment

This change is **COMPLIANT** with the CONSTITUTION:

✅ **Article I (Enterprise from Line 1):** UI is premium from day 1, not deferred
✅ **Article II (Anti-Refactoring):** Building correctly the first time
✅ **Article III (Battle-Tested Doctrine):** Using React/Next.js (battle-tested)
✅ **Article VI (Iteration Principle):** Adding features (new UI service)

**Not a violation because:**
- We're **adding** the UI service (iteration)
- We're **using battle-tested tools** (Next.js, not custom)
- We're **building enterprise-grade from line 1** (premium UX, not deferred)

---

**Conclusion:** The old monolith constraints don't apply to microservices. Each service uses the best tool for its job. The UI service MUST use modern frameworks to compete.
