# 🤖 AI AGENT INSTRUCTIONS

**Read this BEFORE touching any code.**

This document explains HOW to work in this repository while complying with [CONSTITUTION.md](CONSTITUTION.md).

---

## 📜 Step 0: Read the Constitution

**STOP. Read [CONSTITUTION.md](CONSTITUTION.md) RIGHT NOW.**

If you haven't read it, you WILL violate it. Go read it. I'll wait.

---

## 🎯 Our Operating Principles (The Short Version)

1. **Enterprise from line 1** - Build the final architecture now, not later
2. **Use battle-tested tools** - Don't write custom code for solved problems
3. **Contracts first** - OpenAPI + JSON Schema before implementation
4. **Evidence always** - SBOM, SLSA, SARIF, tests, coverage, traces
5. **Binary gates** - PASS or FAIL, no subjective evaluation
6. **No refactoring** - Build correctly the first time

---

## 🚀 Workflow: Before Writing Code

### Step 1: Understand the Request

**Ask yourself:**
- What is the user trying to achieve?
- Is this adding a feature or fixing a bug?
- Does this require a new service or modifying existing?

### Step 2: Check Existing Architecture

**Read these files:**
- `docs/11_211025/delivery.md` - Enterprise skeleton
- `packages/contracts/openapi/*.openapi.yaml` - Service contracts
- `packages/contracts/schema/*.json` - Message schemas
- `docs/09_191025_todays_status/New_repo_microservice_discussion/01_VISION_CHEAT_SHEET.md` - Vision

### Step 3: Search for Existing Solutions

**Before writing ANY custom code:**

```bash
# Search npm
npm search [keyword]

# Check if library exists
pnpm add [library-name] --dry-run

# Read existing code
grep -r "similar-pattern" services/
```

**If a library exists for your need, USE IT. Don't write custom.**

### Step 4: Create ADR (If Architectural Decision)

If you're:
- Adding a new service
- Choosing between technologies
- Changing a contract

**Create an ADR:**

```markdown
# ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Rejected

## Context
[What problem are we solving?]

## Decision
[What did we decide?]

## Consequences
[What are the impacts?]

## Alternatives Considered
1. Alternative A: [why rejected]
2. Alternative B: [why rejected]
```

Save to: `docs/architecture/decisions/ADR-XXX-title.md`

---

## 🛠️ Workflow: Adding a New Service

### Step 1: Copy Template

```bash
# Copy runner-da as template
cp -r services/runner-da services/new-service-name

# Update package.json
sed -i '' 's/runner-da/new-service-name/g' services/new-service-name/package.json
```

### Step 2: Define Contract FIRST

Create `packages/contracts/openapi/new-service-name.openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: New Service Name
  version: 1.0.0
servers:
  - url: http://localhost:7019
paths:
  /healthz:
    get:
      responses:
        '204': { description: OK }
  /readyz:
    get:
      responses:
        '204': { description: Ready }
```

### Step 3: Implement Service

```typescript
// services/new-service-name/src/server.ts
import express from "express";
import { connect, StringCodec } from "nats";

const app = express();
const sc = StringCodec();

async function main() {
  const nc = await connect({
    servers: process.env.NATS_URL || "nats://localhost:4222"
  });

  // Health endpoints
  app.get("/healthz", (_req, res) => res.sendStatus(204));
  app.get("/readyz", (_req, res) => res.sendStatus(204));
  app.listen(7019, () => console.log("new-service-name listening on :7019"));

  // Subscribe to NATS work subject
  const sub = nc.subscribe("work.new-kind.request");

  for await (const m of sub) {
    const msg = JSON.parse(sc.decode(m.data));
    const { execId, reply } = msg;

    // DO WORK HERE
    const result = { /* ... */ };

    // Reply
    if (reply) {
      await nc.publish(reply, sc.encode(JSON.stringify(result)));
    }
  }
}

main().catch(console.error);
```

### Step 4: Add to Orchestrator

```typescript
// apps/mca-orchestrator/src/graph/state.ts

async function newServiceNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("new-kind", {
    execId: state.execId,
    /* inputs */
  });

  // Update state
  return { ...state, /* updates */ };
}

// Add to workflow
export const workflow = new StateGraph(AgentState)
  // ... existing nodes
  .addNode("newService", newServiceNode)
  // ... add edges
```

### Step 5: Write Tests

```typescript
// services/new-service-name/src/server.test.ts
import { describe, it, expect } from 'vitest';

describe('new-service-name', () => {
  it('should respond to health check', async () => {
    const res = await fetch('http://localhost:7019/healthz');
    expect(res.status).toBe(204);
  });

  it('should process work requests', async () => {
    // Test NATS request/reply
  });
});
```

### Step 6: Add Evidence

```typescript
// Generate evidence in service
import { Client as MinioClient } from 'minio';

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: 9000,
  useSSL: false,
  accessKey: "admin",
  secretKey: "password123"
});

// Upload artifact
await minio.fPutObject(
  "evidence",
  `${execId}/new-service-output.json`,
  outputPath
);
```

---

## 🔍 Workflow: Modifying Existing Service

### Step 1: Check Contract

**Read the OpenAPI spec first:**

```bash
cat packages/contracts/openapi/service-name.openapi.yaml
```

**Ask:**
- Does my change break the contract?
- Do I need to version the schema?

### Step 2: Update Contract (If Needed)

**If adding new field:**

```yaml
# Add to schema
properties:
  existingField: { type: string }
  newField: { type: string }  # New field
```

**If breaking change:**

```yaml
# Create v2 schema
$id: "https://autonomous.local/schemas/work-item.v2.json"
```

### Step 3: Implement Change

- Modify service code
- Update tests
- Ensure coverage ≥80%

### Step 4: Update Documentation

- Update OpenAPI spec
- Update README if workflow changes
- Create migration guide if breaking change

---

## ✅ Workflow: Pull Request Checklist

Before submitting PR, verify:

### Code Quality
- [ ] All tests passing (`pnpm test`)
- [ ] Coverage ≥80% (`pnpm run coverage`)
- [ ] Lint passing (`pnpm run lint`)
- [ ] TypeScript compiles (`pnpm run typecheck`)

### Evidence
- [ ] SBOM generated (CI will check)
- [ ] Security scans passing (CI will check)
- [ ] Contracts validated (CI will check)
- [ ] Traces work (manual test in Grafana)

### Documentation
- [ ] OpenAPI spec updated (if contract changed)
- [ ] ADR created (if architectural decision)
- [ ] README updated (if workflow changed)
- [ ] Migration guide (if breaking change)

### Constitution Compliance
- [ ] No custom implementations of battle-tested tools
- [ ] No deferred infrastructure ("we'll add later")
- [ ] No monolithic patterns
- [ ] Binary gates enforced
- [ ] Evidence artifacts generated

---

## 🚫 Common Violations (DON'T DO THESE)

### ❌ Violation 1: Custom LLM Wrapper

```typescript
// DON'T DO THIS
class CustomLLM {
  async generate(prompt: string) {
    // Custom retry logic
    // Custom error handling
    // Custom streaming
  }
}
```

**Why wrong:** LangChain exists. Use it.

**Correct approach:**

```typescript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "gpt-4"
});
const result = await model.invoke(prompt);
```

---

### ❌ Violation 2: Deferring Evidence

```typescript
// DON'T DO THIS
async function processTask() {
  // Do work
  // TODO: Add SBOM generation later
  // TODO: Add security scan later
  return result;
}
```

**Why wrong:** Evidence must be generated NOW, not later.

**Correct approach:**

```typescript
async function processTask() {
  // Do work

  // Generate SBOM
  await generateSBOM(workspace);

  // Run security scan
  const sarif = await runSemgrep(workspace);

  // Upload to MinIO
  await uploadEvidence(execId, { sbom, sarif });

  return result;
}
```

---

### ❌ Violation 3: Subjective Gates

```typescript
// DON'T DO THIS
function validateQuality(code: string): boolean {
  // Looks good to me!
  return true;
}
```

**Why wrong:** Gates must be binary with evidence.

**Correct approach:**

```typescript
function validateQuality(coverageReport: CoverageReport): GateResult {
  const lineCoverage = coverageReport.lines.pct;

  if (lineCoverage < 80) {
    return {
      gate: "G3",
      status: "FAIL",
      reason: `Coverage ${lineCoverage}% < 80%`,
      artifacts: { coverage: coverageUrl }
    };
  }

  return {
    gate: "G3",
    status: "PASS",
    artifacts: { coverage: coverageUrl }
  };
}
```

---

### ❌ Violation 4: Breaking Contracts

```typescript
// DON'T DO THIS
interface WorkItem {
  execId: string;
  // Removed taskId field (BREAKING CHANGE!)
  kind: string;
}
```

**Why wrong:** Existing services expect `taskId`.

**Correct approach:**

```typescript
// Version the schema
interface WorkItemV2 {
  execId: string;
  taskId: string;  // Keep for v1 compatibility
  kind: string;
  // Add new fields as optional
  newField?: string;
}
```

---

## 📚 Reference: Key Files

### Must Read Before Any Work
1. `CONSTITUTION.md` - The supreme law
2. `AI_INSTRUCTIONS.md` - This file
3. `docs/11_211025/delivery.md` - Enterprise skeleton

### Architecture
- `packages/contracts/openapi/*.openapi.yaml` - Service contracts
- `packages/contracts/schema/*.json` - Message schemas
- `docs/architecture/decisions/` - ADRs

### Vision & Requirements
- `docs/09_191025_todays_status/New_repo_microservice_discussion/01_VISION_CHEAT_SHEET.md`

### Implementation Examples
- `apps/mca-orchestrator/src/graph/state.ts` - LangGraph orchestrator
- `services/runner-da/src/server.ts` - Service template
- `apps/gateway/src/server.ts` - Gateway pattern

---

## 🆘 When You're Stuck

### Question 1: "Should I write custom code?"

**Answer:** NO. Search for a library first.

```bash
npm search [keyword]
```

If no library exists:
1. Create ADR explaining why custom code needed
2. Document 3+ alternatives considered
3. Get approval from repository owner
4. Implement with tests + evidence

### Question 2: "Can I refactor this?"

**Answer:** Only if:
- New information invalidates design
- Technology deprecated/vulnerable
- Scale requirements exceed capacity (with metrics)
- Regulatory change requires it

Otherwise: NO. Add features instead.

### Question 3: "Can I skip [tests/SBOM/security scan] for now?"

**Answer:** NO. Evidence is required from line 1.

### Question 4: "This monolithic approach would be faster..."

**Answer:** STOP. Re-read CONSTITUTION.md Article I.

Monoliths are BANNED. Build microservices from day 1.

---

## 🎓 Examples: Good vs. Bad

### Example 1: Adding HTTP Client

**❌ Bad:**
```typescript
// Custom HTTP wrapper
class HTTPClient {
  async request(url: string) {
    // Custom retry
    // Custom timeout
    // Custom error handling
  }
}
```

**✅ Good:**
```typescript
import got from 'got';
import pRetry from 'p-retry';

const response = await pRetry(
  () => got(url, { timeout: 60000 }),
  { retries: 3 }
);
```

---

### Example 2: Adding a Gate

**❌ Bad:**
```typescript
function checkSecurity() {
  console.log("Security looks fine");
  return true;
}
```

**✅ Good:**
```typescript
async function securityGate(execId: string): Promise<GateEvidence> {
  // Run Semgrep
  const sarif = await runSemgrep(workspace);

  // Check for HIGH/CRITICAL
  const critical = sarif.results.filter(r =>
    r.level === "error" || r.severity === "critical"
  );

  // Binary decision
  if (critical.length > 0) {
    return {
      gate: "G2",
      status: "FAIL",
      reason: `${critical.length} HIGH/CRITICAL findings`,
      artifacts: { sarif: await uploadToMinio(execId, sarif) }
    };
  }

  return {
    gate: "G2",
    status: "PASS",
    artifacts: { sarif: await uploadToMinio(execId, sarif) }
  };
}
```

---

## 🔒 Final Reminder

**You are building an ENTERPRISE SYSTEM, not a prototype.**

- Every line of code is production-grade
- Every decision is evidence-backed
- Every gate is binary
- Every service is isolated
- Every contract is versioned
- Every artifact is stored

**Enterprise from Line 1. Always.**

---

**Questions?**
1. Re-read CONSTITUTION.md
2. Check docs/11_211025/delivery.md
3. Ask repository owner

**Ready to code?**
1. ✅ Read CONSTITUTION.md
2. ✅ Read this file
3. ✅ Check contracts
4. ✅ Search for libraries
5. ✅ Write code
6. ✅ Generate evidence
7. ✅ Submit PR

**Let's build.** 🚀
