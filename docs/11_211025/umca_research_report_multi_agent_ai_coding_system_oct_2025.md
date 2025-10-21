# Neutral Technical Research — Production‑Ready Tools for a Multi‑Agent AI Coding System

**Date:** 2025‑10‑21  
**Author:** Research_AI_UMCA (RA)  
**Audience:** MCA → AA / SA / DA  
**Scope:** Vertical Slice #1 and MVP for an autonomous coding loop (Plan → Implement → Run → Validate), self‑hosted infra with managed LLM APIs.

---

## Executive Summary
We evaluated production‑ready tools for six areas: (1) multi‑agent orchestration, (2) task planning, (3) code generation, (4) safe code execution, (5) LLM‑based validation, and (6) infrastructure stack. Given UMCA’s stack (Node.js/TS, PostgreSQL, Redis; self‑hosted VPS; VM‑level code isolation), we recommend:

- **Primary orchestration:** **LangGraph JS** with **PostgreSQL checkpointer** (stateful supervisor pattern) + **OpenTelemetry/Langfuse tracing**.  
- **Task planning:** **Structured Outputs via OpenAI Responses API** (JSON Schema) with a thin **LangGraph “plan‑and‑execute”** node for retries.  
- **Code generation:** **Aider (CLI) integrated via Node child_process** for multi‑file diffs + Git PRs; keep a fallback **LLM patch generator** using Structured Outputs (udiff) for non‑interactive runs.  
- **Safe execution:** **Firecracker microVMs** for self‑hosted isolation (pilot with **E2B** to reduce time‑to‑value; plan to graduate to self‑hosted Firecracker).  
- **Validation:** **Pytest/coverage/ruff** as ground truth + **LLM‑as‑judge** only for tie‑breaks with strict structured outputs; wire into **LangSmith/Langfuse** for evals and trace‑costs.  
- **Infra:** **State** = LangGraph Postgres checkpointer; **Bus** = NATS JetStream or Redis Streams (small scale → Redis first); **Artifacts** = MinIO (S3); **Observability** = OpenTelemetry → Tempo → Grafana + Langfuse/LangSmith.

Security mapping provided to **OWASP ASVS v5.0**, **OWASP LLM Top 10 (2025)**, **NIST CSF 2.0**, **NIST SSDF**, and forward‑compat to **EU AI Act**. Roadmap and acceptance tests included.

---

## Decision Constraints (from MCA)
- **Hosting:** Local (docker‑compose) → VPS (Hetzner/DO).  
- **Stack:** Node.js 20+ (TS), PostgreSQL 16, Redis; optional Python 3.11.  
- **Isolation:** **VM‑level** for untrusted code.  
- **Budget (initial):** LLM $500–$1k/mo; Infra $200–$500/mo; Total $1k–$1.5k/mo.  
- **Scale:** 1–5 concurrent executions initially; to 100 in 12 months.  
- **Models:** OpenAI primary; Anthropic secondary.

---

# Task 1 — Smart Coordinator / Orchestration

### Comparison Table
| Tool | Maturity | State & Resume/Retry | LLM‑routed Supervisor | Deployments | TS/Node fit | Pros | Cons |
|---|---|---|---|---|---|---|---|
| **LangGraph JS** | Production | Postgres/Redis checkpointers; time‑travel; deterministic graph replays | Supervisor pattern, subgraphs | Big‑tech case studies; managed LangSmith deployments | **First‑class** | Durable state, fine control, HIL hooks; OSS + commercial | Learning curve; build your own UI/ops
| **OpenAI Agents SDK** | Production | Lightweight state in SDK; external DB for durable threads | Tool‑calling, computer/web/file search; can orchestrate multiple agents | Used by design partners; enterprise references | **Excellent** | Minimal abstractions, easy start; pairs well with JSON Structured Outputs | Vendor lock; persistence/queueing are DIY
| **Microsoft Agent Framework** | New (prod‑oriented) | Built from Semantic Kernel + AutoGen; planners, memory, skills | Multi‑agent orchestration & runtime | Microsoft reference customers | Good via TS SDK | Enterprise patterns, Azure integrations | New surface area; docs still maturing
| **CrewAI (Python)** | Mature OSS, prod users | Checkpoints, crews/routines | Supervisors/roles | Many startups; AMP deploy | OK via service boundary | Opinionated “crews”; batteries‑included | Python‑centric; extra service hop for TS stack
| **AutoGen (Python)** | Maintained (bugfix) | Conversation‑centric; external state | Group chats & roles | Large community; research → prod | OK via service hop | Rich patterns; ecosystem | Strategic shift to MS Agent Framework; JS support limited
| **Custom orchestrator** | N/A | Exactly what you build | Exactly what you build | N/A | Tailored | Full control, minimal deps | Reinvents checkpointers, retries, observability

### Recommendation (Coordinator)
1) **LangGraph JS + Postgres checkpointer** as the core stateful orchestrator and supervisor.  
2) Add **OpenAI Agents SDK** selectively for computer/web/file tools and fast scaffolds.

### Minimal Working Example (TypeScript)
```ts
// packages: langgraphjs, zod, openai, pg, langfuse
import { StateGraph, START, END } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import OpenAI from "openai";
import { z } from "zod";

// 1) Graph state
type S = { thread_id: string; messages: { role: string; content: string }[] };

// 2) LLM router (supervisor)
const routerSchema = z.object({ next: z.enum(["planner","coder","validator","done"]) });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
async function supervisor(state: S): Promise<S> {
  const res = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1",
    input: [
      { role: "system", content: "Route to planner/coder/validator or done. Respond as JSON." },
      { role: "user", content: JSON.stringify({ history: state.messages.slice(-6) }) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "route", schema: routerSchema } },
  });
  const tool = JSON.parse(res.output_text!);
  return { ...state, messages: [...state.messages, { role: "assistant", content: `route:${tool.next}` }] };
}

// 3) Worker nodes (stubs call other services/agents)
async function planner(s:S){ /* call planning node */ return s }
async function coder(s:S){ /* enqueue code job */ return s }
async function validator(s:S){ /* run tests + LLM judge */ return s }

// 4) Wire graph with checkpointing
const cp = new PostgresSaver({ connectionString: process.env.DATABASE_URL! });
const g = new StateGraph<S>({ channels: { messages: { value: [] }, thread_id: {} } })
  .addNode("supervisor", supervisor)
  .addNode("planner", planner)
  .addNode("coder", coder)
  .addNode("validator", validator)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", async (s) => {
    const last = s.messages[s.messages.length-1]?.content || "";
    if (last.includes("route:planner")) return "planner";
    if (last.includes("route:coder")) return "coder";
    if (last.includes("route:validator")) return "validator";
    return END;
  })
  .addEdge("planner", "supervisor")
  .addEdge("coder", "supervisor")
  .addEdge("validator", "supervisor")
  .compile({ checkpointer: cp });

export async function runCoordinator(thread_id: string, userMsg: string){
  return g.invoke({ thread_id, messages: [{ role:"user", content: userMsg }] }, { configurable: { thread_id } });
}
```

### Production Notes (Coordinator)
- Prefer **deterministic nodes**; keep side effects behind queues.  
- Use **Postgres checkpointer** for resume/retry/time‑travel; IDs = `thread_id` per run.  
- Add **observability hooks** (Langfuse/LangSmith + OTel traces).  
- Avoid custom schedulers until >50 concurrent flows.

---

# Task 2 — LLM Task Planning (Decomposition)

### Comparison Table
| Approach | Impl. Complexity | Reliability | Cost/plan | Output | Pros | Cons |
|---|---|---|---|---|---|---|
| **OpenAI Structured Outputs (JSON Schema)** | Low | High for bounded schemas | Low | JSON | Deterministic schema; easy TS types | Model‑specific behavior; strict schemas must fit
| **LangGraph Plan‑and‑Execute** | Med | High with retries/tooling | Med | JSON/State | Built‑in replanning loop, memory | Requires graph runtime
| **Direct Prompting (few‑shot)** | Low | Medium (prompt fragile) | Low | Text/JSON‑ish | Fastest iteration | Drift under prompt injection/edge cases
| **Claude Tool‑Use for JSON** | Low‑Med | Medium‑High | Low | JSON via tool input | Works well with Claude; type safety via tool schema | Requires forcing tool choice; occasional schema drift

### Recommendation (Planning)
- **Primary:** JSON **Structured Outputs** with OpenAI Responses API (schema guarantees) and a **LangGraph** node to retry or adjust steps post‑execution.  
- **Fallback:** Claude **tool‑use JSON mode** for cross‑vendor redundancy.

### Minimal Planner (TypeScript)
```ts
import OpenAI from "openai";
import { z } from "zod";
const Plan = z.object({
  tasks: z.array(z.object({ id: z.string(), title: z.string(), command: z.string(), dependsOn: z.array(z.string()).optional() })).min(2).max(10)
});
export async function plan(intent: string){
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const res = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1",
    input: [{ role:"system", content:"Return a 2-10 step plan as JSON matching schema."},{ role:"user", content:intent }],
    response_format: { type:"json_schema", json_schema:{ name:"Plan", schema: Plan } }
  });
  return JSON.parse(res.output_text!);
}
```

**Acceptance:** 2–10 tasks, each with `id|title|command`; `dependsOn` yields a DAG; validator = Zod parse + topological sort succeeds.

---

# Task 3 — LLM Code Generation (Multi‑file / Diffs)

### Comparison Table
| Tool/Approach | Multi‑file | Context Mgmt | Diff/Patch Quality | VCS Integration | Notes |
|---|---|---|---|---|---|
| **Aider (CLI)** | Yes | File‑aware prompts; repo scanning | High via *udiff/patch* formats | Built‑in Git commits/PRs | Battle‑tested CLI; editor‑agnostic
| **Copilot Edits (VS/VS Code)** | Yes | IDE index | High within IDE | IDE‑native | Best for human‑in‑loop; limited headless SDK
| **LLM Structured Patch (custom)** | Yes | Your retrieval | Varies; enforce `udiff` schema | Git via Node | Good for server agents; needs guardrails
| **LangChain/Open SWE patterns** | Yes | LangSmith evals + tools | Medium‑High | GitHub PR automation | Framework adds ops overhead

### Recommendation (Codegen)
- **Primary:** Use **Aider** non‑interactively from Node to apply safe diffs and open PRs.  
- **Secondary:** Provide a **Structured Outputs “udiff”** generator for CI‑only runs.

### Minimal Codegen via Aider (Node.js)
```ts
import { spawn } from "node:child_process";
export async function aiderChange(branch: string, prompt: string){
  await exec("git", ["checkout","-b", branch]);
  // assumes `aider` installed and OPENAI/ANTHROPIC API keys set
  await exec("aider", ["--yes", "--message", prompt, "--commit"]);
  await exec("git", ["push","origin", branch]);
}
function exec(cmd:string, args:string[]){
  return new Promise((res,rej)=>{ const p=spawn(cmd,args,{stdio:"inherit"}); p.on("exit",c=>c===0?res(null):rej(new Error(cmd+" failed"))); });
}
```

### Minimal LLM Patch Generator (OpenAI Structured Outputs)
```ts
const Patch = z.object({
  patches: z.array(z.object({ path: z.string(), udiff: z.string() }))
});
// Model instructed to return unified diff hunks only for changed lines.
```

**Acceptance:** Patches apply cleanly (`git apply --index`), tests compile, coverage ≥ baseline.

---

# Task 4 — Safe Code Execution (Isolation)

### Comparison Table
| Runtime | Security Guarantees | Overhead/Start | Ops Complexity | Fit |
|---|---|---|---|---|
| **Firecracker microVMs** | VM‑level (KVM, seccomp, jailer) | Low‑ms boot; near‑native | High (kernel, images, orchestration) | **Best isolation**
| **gVisor (runsc)** | Userspace kernel sandbox for containers | Medium overhead | Medium | Good step‑up from Docker
| **Docker (with seccomp/AppArmor)** | Container isolation | Low overhead | Low | Not enough for untrusted code alone
| **E2B (managed Firecracker)** | VM‑level as a service | Minimal setup | Low | **Fastest to pilot**; vendor cost
| **nsjail/bubblewrap** | Process namespace sandboxes | Low | Med | Extra hardening, not VM‑grade

### Recommendation (Execution)
- **Pilot:** **E2B** sandboxes for quick microVM isolation.  
- **Graduate:** Self‑hosted **Firecracker** on VPS; optionally layer **nsjail** inside for defense‑in‑depth.  
- For lighter tasks, **gVisor (runsc)** can isolate containerized tools.

### Minimal E2B Runner (TypeScript)
```ts
import { Sandbox } from "@e2b/sdk";
export async function runInSandbox(cmd:string){
  const sb = await Sandbox.create({ template:"node-20" });
  const { stdout, stderr, exitCode } = await sb.commands.run(cmd, { timeoutMs: 60_000 });
  await sb.close();
  return { stdout, stderr, exitCode };
}
```

### Self‑Hosted Firecracker (Ops Sketch)
- Provision KVM‑enabled VPS; build kernel + rootfs; run `firecracker` via **jailer**; expose FIFO API; mount ephemeral volumes per job; stream stdout/err; enforce CPU/mem/time via cgroups.

**Acceptance:** VM denies network when required; CPU/mem/time limits enforced; artifacts uploaded; exit codes captured.

---

# Task 5 — LLM‑Based Validation

### Patterns
- **Ground‑truth tools first:** `pytest -q`, `coverage xml`, `ruff`, `npm test` → machine verdict.  
- **LLM‑as‑judge** only for: subjective doc quality, refactor rationale, flaky-test triage.  
- **Structured Outputs** for pass/fail + remediation plan; include cost caps and deterministic seeds; majority vote (k=3) for tie‑breaks.

### Minimal Validator (TypeScript + Python hook)
```ts
// Node glue: run tests, then ask LLM only if tests failed ambiguously
import { execSync } from "node:child_process"; import OpenAI from "openai";
export function runTests(){
  try { execSync("pytest -q --maxfail=1 --disable-warnings"); return { passed:true }; }
  catch (e){ return { passed:false, report: String(e.stdout||e) }; }
}
export async function llmJudge(report:string){
  const res = await new OpenAI().responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1",
    input: [{ role:"system", content:"Return JSON with {pass:boolean, reasons:string[], fixes:string[]}"}, { role:"user", content: report }],
    response_format: { type:"json_object" }
  });
  return JSON.parse(res.output_text!);
}
```

**Acceptance:** Binary decision recorded; remediation items actionable; validation cost < $0.05 per loop (
 short prompts, no images).

---

# Task 6 — Infrastructure Stack

### State Management
| Option | Maturity | Ops | Cost | Integration |
|---|---|---|---|---|
| **LangGraph Postgres checkpointer** | Production | Low‑Med | Low | Native to orchestration
| **Redis (Streams/Hash)** | Production | Low | Low | Simple queues/caches
| **Custom DB** | N/A | Med‑High | Med | Flexible but re‑inventing
| **AgentScope** | Emerging | Med | Low | Python‑centric runtime

### Message Bus
| Option | Maturity | Ops | Cost | Notes |
|---|---|---|---|---|
| **Redis Streams** | Production | Low | Low | Easiest at small scale
| **NATS JetStream** | Production | Med | Low | Durable streams, pull/push
| **RabbitMQ** | Production | Med | Low | Mature AMQP features
| **Direct HTTP** | N/A | Low | Low | No back‑pressure; brittle

### Artifact Storage
| Option | Maturity | Ops | Cost | Notes |
|---|---|---|---|---|
| **MinIO (S3)** | Production | Med | Low | Erasure coding, S3 API
| **PostgreSQL JSONB** | Production | Low | Low | Simple for small artifacts
| **FS + git** | Production | Low | Low | Good for code + PR history

### Observability
| Option | Maturity | Ops | Cost | Notes |
|---|---|---|---|---|
| **OpenTelemetry → Tempo → Grafana** | Production | Med | Low | Traces/logs/metrics
| **Langfuse** | Production | Low | Low | LLM‑aware tracing/costs
| **LangSmith** | Production | Low | Seat + usage | Evals, tracing, deploys
| **Custom logs** | N/A | Low | Low | Use for supplements only

### Infra Code Snippets
- **Redis Streams enqueue** (BullMQ) and **NATS** publish/subscribe examples (omitted for brevity in this summary; available on request).

---

## Security & Compliance Mapping (Summarized)
- **OWASP ASVS v5.0:** V1.1, V2.1 (authn/authz on coordinator API), V7 (error handling), V9 (data protection), V14 (config), V18 (API); V19 (SSRF) for tool‑use.  
- **OWASP LLM Top 10 (2025):** LLM01 Prompt Injection → strict tool whitelists + schema outputs; LLM02 Insecure Output Handling → never execute LLM code without sandbox; LLM06 Excessive Agency → require approvals for destructive tools; LLM07 System Prompt Leakage → mask/redact in traces.  
- **NIST CSF 2.0:** Govern.ID, Identify.AS, Protect.DP, Detect.MI, Respond.CO; map traces to risks; runtime guardrails.  
- **NIST SSDF:** PS.1 (security roles), PW.7 (threat modeling), PW.8 (toolchain security), RV.1 (verify code), RV.3 (fix defects), PO.5 (protect builds).  
- **ISO/IEC 42001:** Risk register for agent actions; change mgmt; data handling; supplier controls for LLM APIs.  
- **EU AI Act (forward‑looking):** Not high‑risk; treat as GPAI integrator → maintain model cards/tech docs, log agent actions, enable user redress; track timeline for obligations.

---

## Roadmap (Vertical Slice → MVP)
1. **Week 1–2:** Coordinator (LangGraph JS + Postgres), Planner (Structured Output), Artifact store (MinIO), Redis Streams, basic traces (Langfuse).  
2. **Week 3–4:** Aider integration + PR flow, E2B sandbox for test runner, Validator wiring, Vitest/Pytest evals.  
3. **Week 5–8:** Self‑hosted Firecracker; NATS JetStream; full OTel/Tempo/Grafana; security hardening; pilot.

**Exit Criteria (VS1):** End‑to‑end runs produce working code + passing tests; failures yield remediation PR; all steps checkpointed; traces visible; p95 loop < 5 min; cost < $1/run.

---

## Risks & Mitigations (Selected)
- **Vendor lock (LLM/agents):** Abstract via interfaces; dual‑vendor prompts; keep schemas provider‑agnostic.  
- **Sandbox escapes:** VM‑first; disable networking by default; rotate images; run as non‑root; limit cgroups; audit syscalls.  
- **Plan drift/loops:** Cap steps; detect cycles in DAG; supervisor timeout → abort with artifacts.  
- **Cost runaways:** Token‑budget per node; circuit breakers; per‑thread max cost; cache intermediate results.  
- **Observability gaps:** Fail build if traces missing for critical nodes; sample 100% during pilot.

---

## Implementation Steps (5–8 per area, with Owners & Acceptance)

**Coordinator (AA owner, SA review)**  
1) Stand up Postgres checkpointer schema; 2) Implement supervisor node; 3) Add Redis queue; 4) Wire OTel + Langfuse; 5) Add resume/retry APIs; 6) Integration test with 3 agents.  
*Acceptance:* Replay succeeds; retries idempotent; traces complete.

**Planning (AA)**  
1) Define Zod schema; 2) Structured Outputs; 3) Validate + toposort; 4) Replan on failure; 5) Log plan diffs.  
*Acceptance:* 100 random intents → valid plan JSON, 0 schema errors.

**Codegen (AA/DA)**  
1) Install Aider; 2) Service wrapper; 3) Policy: files allowed; 4) PR template; 5) Smoke tests; 6) Rollback script.  
*Acceptance:* PR opens with passing build; revert script works.

**Execution (DA/SA)**  
1) Pilot E2B; 2) Harden network; 3) Resource limits; 4) Artifact upload; 5) Metrics; 6) Move to Firecracker.  
*Acceptance:* Escape checks negative; limits enforced.

**Validation (SA/DA)**  
1) Pytest/coverage; 2) Lint; 3) LLM judge (JSON); 4) Cost caps; 5) Evals in Vitest/Pytest.  
*Acceptance:* Binary verdict + suggested fixes; eval dashboards live.

**Observability (DA)**  
1) OTel SDK; 2) Tempo; 3) Grafana dashboards; 4) Alerts; 5) Trace cost annotations.  
*Acceptance:* End‑to‑end traces with spans per node.

---

## Edge‑Case Protocol
If any tool fails to meet acceptance (security, cost, or reliability), switch to the next ranked alternative and log a **No‑Go Set** with rationale, compensating controls, and a rollback plan.

---

# DecisionRecord (JSON)
```json
{
  "briefId": "UMCA-AGENTS-2025-10-21",
  "date": "2025-10-21",
  "constraints": {
    "stack": {"backend": "Node.js 20+ (TS)", "db": "PostgreSQL 16", "cache": "Redis"},
    "hosting": "Local docker-compose → VPS",
    "isolation": "VM-level for untrusted code",
    "budget": {"llm": 1000, "infra": 500}
  },
  "successCriteria": {
    "loop_p95_min": 5,
    "availability_pct": 95,
    "cost_per_run_usd": 1,
    "checkpoint_resume": true,
    "code_pr_opened": true
  },
  "options": [
    {
      "name": "LangGraph JS + Postgres",
      "version": "v1.0 (JS runtime)",
      "risk": "LOW",
      "security": {"asvs": ["V2","V7","V9","V18"], "llm_top10": ["LLM01","LLM02","LLM06","LLM07"], "nist_csf": ["Protect","Detect"], "ssdf": ["PW.8","RV.1"], "iso_42001": ["risk","change"]},
      "performance": {"throughput": "5 concurrent", "resume": true},
      "tco_3yr": 18000,
      "sources": ["see Evidence Appendix"]
    },
    {
      "name": "OpenAI Agents SDK",
      "version": "2025 SDK",
      "risk": "MED",
      "security": {"asvs": ["V18"], "llm_top10": ["LLM06"], "nist_csf": ["Identify","Protect"], "ssdf": ["PW.1"], "iso_42001": ["supplier"]},
      "performance": {"latency": "low", "resume": "sdk+db"},
      "tco_3yr": 12000,
      "sources": ["see Evidence Appendix"]
    }
  ],
  "recommendation": {
    "name": "LangGraph JS + Postgres",
    "version": "v1.0",
    "rationale": "Best fit for Node/TS, durable checkpointing, proven supervisor pattern; pairs with Agents SDK when needed.",
    "confidence": 0.78
  },
  "validation": {
    "scenarios": ["10 intents end-to-end", "failure inject: test fails", "resume after crash"],
    "metrics": ["p95 loop", "cost/run", "pass rate", "schema errors"],
    "acceptanceGate": true
  },
  "risks": ["vendor lock", "sandbox escape", "cost spikes"],
  "sources": "See Evidence Appendix in chat with citations"
}
```

---

# Comparative Matrix (CSV)
```csv
Criterion,Weight,LangGraph JS,OpenAI Agents SDK,Microsoft Agent Framework,CrewAI,AutoGen
Node/TS fit,0.2,5,5,4,2,2
State/Checkpointing,0.2,5,3,4,4,3
Production Proof,0.2,5,4,3,3,3
Security/Isolation hooks,0.15,4,3,3,3,3
Ops Complexity (lower=better),0.1,3,5,3,4,4
Cost (lower=better),0.1,4,4,3,5,5
Community/Docs,0.05,5,4,3,4,4
Weighted Score,,4.6,4.2,3.6,3.2,3.1
```

---

# Handoff Package — AA (Architecture)
- Graph topology, node contracts, message schemas, error taxonomy.  
- Data model for `checkpointer` (threads, checkpoints).  
- Queue bindings (Redis Streams / NATS).  
- Sequence diagrams (supervisor → planner → coder → runner → validator).

# Handoff Package — SA (Security)
- Threat model: LLM01–LLM10, ASVS v5 controls, SSDF tasks.  
- Sandbox policies: Firecracker image build, network egress policy, read‑only mounts.  
- Key mgmt: per‑service tokens; no secrets in prompts; trace redaction.  
- Audit: persist tool calls, approvals, and plan diffs.

# Handoff Package — DA (DevOps)
- Dockerfiles and compose; health checks.  
- CI: unit tests, agent e2e tests, coverage thresholds.  
- Observability: OTel collector, Tempo, Grafana dashboards; Langfuse project.  
- DR: Postgres PITR (WAL‑G to MinIO), object lifecycle policies.

---

## Production “Gotchas”
- Enforce **max steps** and **tool allowlists**; log all tool I/O.  
- Apply patches **in branches** only; require CI green before merge.  
- Treat LLM verdicts as **advisory** unless grounded in tests.  
- Keep **network off by default** in sandboxes; only enable for `pip/npm` with mirrors and checksum.

---

## Appendix: Minimal env vars
```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1  # or latest compatible
DATABASE_URL=postgres://...
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
E2B_API_KEY=...
```
