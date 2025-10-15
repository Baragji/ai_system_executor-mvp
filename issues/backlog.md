# Issues Backlog (Repo-Synchronized)

Updated: 2025-10-11
Scope: src/* only. Entries are code-verified. Obsolete items are marked Resolved with evidence.

---

## Active Issues

### ISSUE-005: LLM Provider Instantiated on Every Request

Severity: HIGH (Performance)
Status: **Resolved** (2025-10-11)
Location:
- src/llm/providers/choose.ts:4-31

Description:
chooseProvider() was returning a new SDK client instance on every call, causing unnecessary initialization overhead and lost connection pooling benefits. **FIXED:** Now implements singleton caching.

Evidence (current code):
```ts
// src/llm/providers/choose.ts
export function chooseProvider() {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
    default:
      return new OpenAIProvider();
  }
}
```

Recommended Fix (singleton caching, lazy per-provider):
```ts
// src/llm/providers/choose.ts
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";

type ProviderKey = "openai" | "anthropic";
const cache: Partial<Record<ProviderKey, OpenAIProvider | AnthropicProvider>> = {};

export function chooseProvider() {
  const key = ((process.env.LLM_PROVIDER || "openai").toLowerCase() as ProviderKey);
  if (!cache[key]) {
    cache[key] = key === "anthropic" ? new AnthropicProvider() : new OpenAIProvider();
  }
  return cache[key]!;
}

// Optional: test helper
export function __resetProviderCache() { (Object.keys(cache) as ProviderKey[]).forEach(k => delete cache[k]); }
```

Tests:
- Unit: chooseProvider() returns the same instance across calls; cache isolates by key.
- Perf: measure end-to-end latency before/after under repeated LLM calls; expect ~5–10ms savings per call.
- Concurrency: parallel calls get a valid instance (idempotent initialization).

Tradeoffs:
- Env changes mid-process won’t switch providers until restart. Acceptable for server apps; otherwise add an explicit setter.

---

### ISSUE-003: Centralized LLM Retries Present; Provider-Level Resilience Optional

Severity: MEDIUM
Status: Partially Resolved (central layer); Optional improvements pending
Location:
- src/llm/index.ts:63-91, 166-182

What exists now:
- Centralized retry with exponential backoff, jitter, and call-level timeout.
- Retry signals emitted via telemetry.

Evidence (current code):
```ts
// src/llm/index.ts
export async function generateJSON(messages: LLMMessage[], options: GenerateJSONOptions = {}): Promise<string> {
  const provider = chooseProvider();
  const maxRetries = Number(process.env.LLM_MAX_RETRIES ?? 3);
  const initialBackoff = Number(process.env.LLM_INITIAL_BACKOFF_MS ?? 1000);
  const maxBackoff = Number(process.env.LLM_MAX_BACKOFF_MS ?? 10000);
  const callTimeout = Number(process.env.LLM_CALL_TIMEOUT_MS ?? 60000);
  let attempt = 0;
  // ...
  const result = await Promise.race([
    provider.generate(inputMessages, { tools: providerTools, signal: options.signal }),
    new Promise<ProviderGenerateResult>((_, rej) =>
      setTimeout(() => rej(new Error(`LLM call timed out after ${callTimeout}ms`)), callTimeout)
    )
  ]);
  // ...
  const retryable = isTimeout || status === 429 || status >= 500 || code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNABORTED";
  if (!retryable || attempt >= maxRetries) throw err;
  const base = Math.min(initialBackoff * Math.pow(2, attempt), maxBackoff);
  const jitter = 0.8 + Math.random() * 0.4;
  const backoff = Math.floor(base * jitter);
  await logEvent("llm_retry", { attempt: attempt + 1, maxRetries, backoffMs: backoff, status, code, message, isTimeout });
  await new Promise(res => setTimeout(res, backoff));
}
```

Gaps/Improvements:
- Provider classes have no internal retry; acceptable given centralized strategy. Keep single source of truth to avoid double-retries.
- Extract retry classification into a small utility (utils/retry.ts) for unit testing and reuse.
- Ensure telemetry includes provider name/model.

Tests:
- Unit: error classification (429/5xx/timeouts retry; 400/401/403 no retry).
- Unit: backoff math and jitter bounds.
- Integration: simulated 429 then success; verify attempts and timing.

Tradeoffs:
- Centralized retries simplify consistency and observability; provider-local retries omitted by design to prevent exponential blowups.

---

## Resolved or No-Longer-Applicable (with Evidence)

### ISSUE-001: Memory Leak – Unbounded Progress Sessions

Severity: CRITICAL
Status: Resolved in code
Location:
- src/server.ts:116, 171-177, 182, 201-212, 1763-1767

Fix details:
- TTL added (PROGRESS_SESSION_TTL_MS) and purgeExpiredProgressSessions() invoked from setProgress().
- Orchestration session removed when progress entry purged.

Evidence (current code excerpts):
```ts
// src/server.ts
const progressSessions = new Map<string, ProgressSnapshot>();
const PROGRESS_SESSION_TTL_MS = Number(process.env.PROGRESS_SESSION_TTL_MS ?? 15 * 60 * 1000);

function purgeExpiredProgressSessions(now: number) {
  for (const [key, entry] of progressSessions.entries()) {
    if (entry.done && now - entry.updatedAt > PROGRESS_SESSION_TTL_MS) {
      progressSessions.delete(key);
      removeOrchestrationSession(key);
    }
  }
}

function setProgress(sessionId: string | undefined, stage: string, progress: number, data?: Record<string, unknown>, done?: boolean) {
  if (!sessionId) return;
  purgeExpiredProgressSessions(Date.now());
  // ...
  progressSessions.set(sessionId, { /* updatedAt, done, etc. */ });
}

export const __progressTest = { set, get, purge, ttl, clear };
```

Tests to keep/regressions to avoid:
- Unit test ttl purge boundaries; confirm done=false entries are retained.

---

### ISSUE-002: Weak Path Traversal Protection

Severity: HIGH (Security)
Status: Resolved in code
Location:
- src/executor/writeFiles.ts:5-37

Fix details:
- decodeURIComponent, null-byte rejection, normalize, absolute path rejection, resolve against root, in-root invariant check before mkdir/write.

Evidence (current code):
```ts
function normalizeAndValidate(relPath: string, rootDir: string): string {
  let decoded = relPath; try { decoded = decodeURIComponent(relPath); } catch {}
  if (decoded.includes("\0")) throw new Error(`Unsafe path (null byte) rejected: ${relPath}`);
  const normalized = path.normalize(decoded);
  if (path.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe absolute path rejected: ${relPath}`);
  }
  const resolvedRoot = path.resolve(rootDir);
  const abspath = path.resolve(resolvedRoot, normalized);
  const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  if (!abspath.startsWith(prefix)) {
    throw new Error(`Path escapes project root: ${relPath}`);
  }
  return abspath;
}
```

Tests to keep:
- URL-encoded traversal, null-byte injection, absolute paths, double-encoding.

---

### ISSUE-004: Unhandled Stream Errors – Process Crash Risk

Severity: CRITICAL
Status: Resolved in code
Location:
- src/runner/runInSandbox.ts:96-110, 123-131, 143, 146, 181, 186

Fix details:
- logStream error handler added; safeWrite wrapper used for all writes.

Evidence (current code):
```ts
const logStream = createWriteStream(logFilePath, { encoding: "utf-8" });
let streamFailed = false;
logStream.on("error", err => { streamFailed = true; console.error(`Log stream error for ${logFilePath}:`, (err as Error).message); });
function safeWrite(data: string) { if (streamFailed) return; try { logStream.write(data); } catch { streamFailed = true; } }
// usage
safeWrite(`${installSummary}\n`);
safeWrite(installResult.stdout);
```

Tests to keep:
- Inject stream error (disk full) and assert process survives and returns results.

---

## Summary Statistics (Open Items Only)

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 1 |
| MEDIUM   | 1 |
| TOTAL    | 2 |

---

## Recommended Prioritization

1) ISSUE-005 (Provider singleton caching) – immediate perf/efficiency win, low risk.
2) ISSUE-003 (Retry/telemetry refinements) – solidify resilience and observability.

---

## Future Evaluation Items (Deferred)

### FUTURE-001: Frontend Framework Evaluation

**Priority:** LOW (Re-evaluate when threshold met)  
**Status:** Deferred  
**Trigger Conditions:**
- [ ] Frontend LOC exceeds 5,000 (current: ~2,382)
- [ ] Component reuse instances >5
- [ ] State management complexity becomes high
- [ ] Team velocity bottleneck identified

**Context:**
Current vanilla JS frontend is appropriate for MVP scale. Framework overhead (~500KB React + bundler) not justified yet. Phase 19 Strategy explicitly calls for vanilla JS chat UI without frameworks.

**When to Re-evaluate:**
Use `.automation/frontend_framework_decision_template.md` when 2+ trigger conditions are met.

**References:**
- Assessment: `.automation/technical_constraint_assessment_2025-10-15.md`
- Template: `.automation/frontend_framework_decision_template.md`
- Summary: `.automation/TECH_CONSTRAINTS_SUMMARY.md`

**Estimated Effort (if triggered):** 2-3 weeks (discovery + pilot + decision)

---

### FUTURE-002: Python Microservice for Model Training

**Priority:** LOW (Phase 22+ - out of MVP scope)  
**Status:** Deferred  
**Trigger Conditions:**
- [ ] Model fine-tuning becomes in-scope for executor
- [ ] Custom ML pipelines required (PyTorch/TensorFlow)
- [ ] Research prototypes need Python-specific libraries

**Context:**
Python integration is acceptable ONLY as separate microservice with API contract. Never in executor codebase (violates stack constraints). TypeScript ecosystem covers 95% of orchestration/execution needs.

**Architecture When Triggered:**
```
Executor (TypeScript) → HTTP/gRPC API → Training Service (Python)
                                              ├─ FastAPI
                                              ├─ PyTorch/TensorFlow
                                              └─ Model versioning
```

**Requirements:**
- Separate repository (`umca-training-service`)
- OpenAPI 3.1 spec for API contract
- Same SBOM/SLSA standards as TypeScript executor
- OpenTelemetry integration
- Discovery note documenting integration points

**References:**
- Assessment: `.automation/technical_constraint_assessment_2025-10-15.md` (Section 4)
- Stack Rules: `ai-stack.json` (forbidden_extensions includes .py)

**Estimated Effort (if triggered):** 4-6 weeks (architecture + implementation + integration)

---

### FUTURE-003: Temporal Workflow Orchestration

**Priority:** MEDIUM (Phase 21+ - if LangGraph insufficient)  
**Status:** Deferred  
**Trigger Conditions:**
- [ ] LangGraph checkpoints cannot handle >1 hour workflow pauses
- [ ] Need for workflow versioning with live migration
- [ ] Multi-cluster deployment with global state coordination

**Context:**
LangGraph provides feature-flagged orchestration (Phase 19). Temporal adds operational complexity (requires Temporal server) but offers stronger durability guarantees for long-running workflows.

**Evaluation Score (preliminary):** 3.92/5.0 (DEFER until triggers met)

**When to Re-evaluate:**
Use `.automation/dependency_evaluation_template.md` if LangGraph proves insufficient for enterprise workflow requirements.

**References:**
- Assessment: `.automation/technical_constraint_assessment_2025-10-15.md` (Section 3)
- ADR-019: `docs/Goal_&_Vision_inspirational_only/03_final_decisions/RA_Deliveries/ADR-019_LangGraph_TS_Orchestrator_2025-10-12.md`

**Estimated Effort (if triggered):** 3-4 weeks (integration + migration + testing)

---

### FUTURE-004: Kafka/Redis Streams for Event Streaming

**Priority:** LOW (Phase 22+ - if BullMQ capacity exceeded)  
**Status:** Deferred  
**Trigger Conditions:**
- [ ] Event throughput >10,000 jobs/minute sustained
- [ ] Need for event replay/time-travel debugging at scale
- [ ] Multi-tenant isolation requirements exceed Redis capabilities

**Context:**
BullMQ + Redis currently handles queue needs. Kafka adds significant operational overhead (cluster management) but provides better scalability for high-throughput event streaming.

**Evaluation Score (preliminary):** 3.31/5.0 (DEFER until scale justifies)

**When to Re-evaluate:**
Monitor queue metrics. If approaching limits, use dependency evaluation template.

**References:**
- Assessment: `.automation/technical_constraint_assessment_2025-10-15.md` (Section 3)
- Current: `src/orchestrator/jobQueue.ts` (BullMQ implementation)

**Estimated Effort (if triggered):** 4-5 weeks (cluster setup + migration + testing)

---
