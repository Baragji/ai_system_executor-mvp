# Issues Backlog

**Created:** 2025-01-09  
**Purpose:** Track code quality issues, bugs, and technical debt identified in production readiness review

---

## 🔴 Critical Issues

### ISSUE-001: Memory Leak - Unbounded Progress Sessions

**Severity:** CRITICAL  
**Impact:** Server crashes after sustained use  
**Effort:** ~30 minutes  
**Status:** 🟡 Backlog

**Location:** `src/server.ts:59-69`

**Description:**
The `progressSessions` Map grows indefinitely without any cleanup mechanism. Every execution adds a session that never gets removed, causing memory to grow linearly with usage until heap exhaustion.

**Current Code:**
```typescript
const progressSessions = new Map<string, ProgressSnapshot>();

function setProgress(sessionId: string | undefined, stage: string, progress: number, ...) {
  if (!sessionId) return;
  progressSessions.set(sessionId, { stage, progress, data, updatedAt: Date.now(), done });
  // ❌ NO CLEANUP - Map grows forever!
}
```

**Root Cause:**
- No TTL (Time-To-Live) mechanism
- No purging of completed sessions
- `clarificationSessions` has proper cleanup (lines 71-92), but pattern not applied here

**Recommended Fix:**
```typescript
// Add TTL and purging similar to clarificationSessions
const PROGRESS_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

function purgeExpiredProgressSessions(now: number) {
  for (const [key, entry] of progressSessions.entries()) {
    if (entry.done && (now - entry.updatedAt > PROGRESS_SESSION_TTL_MS)) {
      progressSessions.delete(key);
    }
  }
}

function setProgress(sessionId: string | undefined, stage: string, progress: number, data?: Record<string, unknown>, done?: boolean) {
  if (!sessionId) return;
  purgeExpiredProgressSessions(Date.now());
  progressSessions.set(sessionId, { stage, progress, data, updatedAt: Date.now(), done });
}
```

**Testing Requirements:**
- Unit test for purging logic
- Memory profiling test simulating 1000+ sessions
- Integration test verifying cleanup after TTL expiry

---

### ISSUE-002: Weak Path Traversal Protection

**Severity:** HIGH (Security)  
**Impact:** Potential sandbox escape, files written outside project directory  
**Effort:** ~45 minutes  
**Status:** 🟡 Backlog

**Location:** `src/executor/writeFiles.ts:5-9`

**Description:**
The `isSafeRelative()` function has insufficient validation that could allow LLM-generated malicious paths to escape the intended output directory.

**Current Code:**
```typescript
function isSafeRelative(p: string) {
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p)) return false;
  if (p.includes("..") || p.includes("\\") || p.includes('"')) return false;
  return true;
}
```

**Vulnerabilities:**
1. String check for `".."` can be bypassed with URL encoding (`%2e%2e`)
2. Doesn't handle symlink attacks
3. No normalization of paths before validation
4. No null byte (`\0`) rejection (common attack vector)
5. Backslash blocking breaks valid Unix filenames

**Recommended Fix:**
```typescript
import path from "node:path";

function isSafeRelative(p: string, rootDir: string): boolean {
  // Normalize and decode first
  const normalized = path.normalize(decodeURIComponent(p));
  
  // Reject absolute paths
  if (path.isAbsolute(normalized)) return false;
  
  // Reject any path that resolves outside root
  const resolved = path.resolve(rootDir, normalized);
  if (!resolved.startsWith(path.resolve(rootDir) + path.sep)) {
    return false;
  }
  
  // Reject null bytes (common attack vector)
  if (normalized.includes('\0')) return false;
  
  return true;
}

export async function writeFiles(rootDir: string, files: ExecutorFile[]) {
  const resolvedRoot = path.resolve(rootDir);
  for (const f of files) {
    if (!isSafeRelative(f.path, resolvedRoot)) {
      throw new Error(`Unsafe path rejected: ${f.path}`);
    }
    const abspath = path.join(resolvedRoot, f.path);
    // Double-check after joining (defense in depth)
    if (!abspath.startsWith(resolvedRoot + path.sep)) {
      throw new Error(`Path escapes project root: ${f.path}`);
    }
    await fs.mkdir(path.dirname(abspath), { recursive: true });
    await fs.writeFile(abspath, f.contents, { encoding: "utf-8" });
  }
}
```

**Testing Requirements:**
- Security test suite for path traversal attempts:
  - URL-encoded paths (`%2e%2e/etc/passwd`)
  - Null byte injection (`../../etc/passwd\0.txt`)
  - Absolute paths (`/etc/passwd`, `C:/Windows/System32`)
  - Double encoding attacks
  - Symlink resolution tests
- Validate existing tests still pass
- Add fuzz testing for edge cases

**References:**
- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory

---

### ISSUE-003: No LLM Rate Limiting or Retry Logic

**Severity:** HIGH  
**Impact:** Poor reliability, user frustration, cost inefficiency  
**Effort:** ~1 hour  
**Status:** 🟡 Backlog

**Location:** 
- `src/llm/providers/openai.ts:15-34`
- `src/llm/providers/anthropic.ts:15-30`

**Description:**
Direct API calls with zero resilience mechanisms. Any transient failure (rate limits, network errors) causes immediate failure, discarding partial work and forcing manual retries.

**Current Code (OpenAI):**
```typescript
async generate(messages: LLMMessage[]): Promise<string> {
  const resp = await this.client.chat.completions.create(requestParams);
  // ❌ No retry on transient failures
  // ❌ No exponential backoff
  // ❌ No rate limit handling
  const content = resp.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}
```

**Problems:**
1. **429 Rate Limit errors** → entire generation fails immediately
2. **Transient network errors** → cryptic errors, manual retry required
3. **5xx server errors** → no retry attempt
4. **Cost inefficiency** → partial work discarded on failure
5. **Poor UX** → user frustration during peak load

**Recommended Fix:**
```typescript
async generate(messages: LLMMessage[]): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await this.client.chat.completions.create(requestParams);
      const content = resp.choices?.[0]?.message?.content;
      if (!content) throw new Error("OpenAI returned empty content");
      return content;
    } catch (err: any) {
      lastError = err;
      
      // Don't retry on non-retryable errors (invalid request, auth)
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        throw err;
      }
      
      // Retry on rate limits and transient errors
      if (err.status === 429 || err.status >= 500 || err.code === 'ECONNRESET') {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`LLM API error (attempt ${attempt + 1}/${maxRetries}), retrying in ${backoffMs}ms:`, err.message);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      // Unknown error, don't retry
      throw err;
    }
  }
  
  throw lastError || new Error('LLM generation failed after retries');
}
```

**Implementation Notes:**
- Apply to both OpenAI and Anthropic providers
- Consider extracting retry logic to shared utility (`src/utils/retry.ts`)
- Add telemetry events for retry attempts
- Make retry config adjustable via environment variables:
  - `LLM_MAX_RETRIES` (default: 3)
  - `LLM_INITIAL_BACKOFF_MS` (default: 1000)
  - `LLM_MAX_BACKOFF_MS` (default: 10000)

**Testing Requirements:**
- Unit tests with mocked API failures (429, 500, 503, ECONNRESET)
- Verify exponential backoff timing
- Verify non-retryable errors (400, 401, 403) fail immediately
- Integration test with rate limit simulation
- Telemetry validation for retry events

**Alternative Approaches:**
1. **Use existing libraries:** `p-retry`, `async-retry`, `axios-retry`
2. **Circuit breaker pattern:** Fail fast if provider is consistently down
3. **Fallback provider:** Switch to Anthropic if OpenAI fails (or vice versa)

---

## 📊 Summary Statistics

| Severity | Count | Total Effort |
|----------|-------|--------------|
| CRITICAL | 1 | ~30 min |
| HIGH | 2 | ~1h 45min |
| **TOTAL** | **3** | **~2h 15min** |

---

## 🎯 Recommended Prioritization

1. **ISSUE-001** (Memory Leak) - Fix immediately before production deployment
2. **ISSUE-002** (Path Traversal) - Security issue, must fix before public release
3. **ISSUE-003** (LLM Retry Logic) - Improves UX significantly, implement after critical fixes

---

---

### ISSUE-004: Unhandled Stream Errors - Process Crash Risk

**Severity:** CRITICAL  
**Impact:** Node.js process crashes on disk/permission errors  
**Effort:** ~20 minutes  
**Status:** 🟡 Backlog

**Location:** `src/runner/runInSandbox.ts:90`

**Description:**
The `createWriteStream()` call has no error handler attached. If the stream encounters an error (disk full, permission denied, I/O error), it will emit an 'error' event. Without a listener, this becomes an **unhandled exception that crashes the entire Node.js process**.

**Current Code:**
```typescript
const logStream = createWriteStream(logFilePath, { encoding: "utf-8" });
let combinedOutput = "";
// ❌ NO ERROR HANDLER - will crash process on stream errors!

// Later writes...
logStream.write(`${installSummary}\n`);
logStream.write(installResult.stdout);
```

**Root Cause:**
- All Node.js streams are EventEmitters
- Unhandled 'error' events on streams crash the process (Node.js behavior)
- File system operations can fail for many reasons (disk full, permissions, network drives, etc.)
- No defensive error handling

**Production Scenarios:**
1. **Disk full during long test run** → Process crashes mid-execution
2. **Permission changes** → Process crashes
3. **Network drive disconnection** → Process crashes
4. **File system quota exceeded** → Process crashes

**Recommended Fix:**
```typescript
const logStream = createWriteStream(logFilePath, { encoding: "utf-8" });
let combinedOutput = "";
let streamFailed = false;

// CRITICAL: Handle stream errors to prevent process crash
logStream.on('error', (err) => {
  streamFailed = true;
  console.error(`Log stream error for ${logFilePath}:`, err.message);
  // Continue execution - we can still return test results without logs
});

// Defensive writes
function safeWrite(data: string) {
  if (!streamFailed) {
    try {
      logStream.write(data);
    } catch (err) {
      console.warn('Log write failed:', err);
      streamFailed = true;
    }
  }
}

// Replace all logStream.write() calls with safeWrite()
safeWrite(`${installSummary}\n`);
```

**Testing Requirements:**
- Mock disk full scenario (stream error injection)
- Verify process doesn't crash when stream fails
- Verify test results still returned even if logging fails
- Add integration test with permission-denied error

**Priority:** **HIGHEST** - This can crash your production server randomly!

---

### ISSUE-005: LLM Provider Instantiated on Every Request

**Severity:** HIGH (Performance)  
**Impact:** Unnecessary SDK initialization overhead, potential rate limit confusion  
**Effort:** ~30 minutes  
**Status:** 🟡 Backlog

**Location:** 
- `src/llm/providers/choose.ts:4-12`
- `src/llm/providers/openai.ts:8-13`
- `src/llm/providers/anthropic.ts:8-13`

**Description:**
The `chooseProvider()` function creates a **new OpenAI/Anthropic SDK instance on every call**, rather than using a singleton pattern. Each instantiation reads environment variables, initializes HTTP clients, and allocates resources unnecessarily.

**Current Code:**
```typescript
// choose.ts
export function chooseProvider() {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(); // ❌ NEW INSTANCE EVERY TIME
    case "openai":
    default:
      return new OpenAIProvider();    // ❌ NEW INSTANCE EVERY TIME
  }
}

// Called from llm/index.ts generateJSON()
const provider = chooseProvider();  // Every LLM call creates new provider!
```

**Performance Impact:**
- **~5-10ms overhead per request** (SDK initialization)
- **Memory churn** from repeated instantiation
- **Connection pool inefficiency** (SDK clients manage HTTP connections)
- For repair loops: 4 attempts × multiple LLM calls = **dozens of unnecessary instantiations**

**Called From:**
- `generateExecutorOutputFromPrompt()` - main generation
- `generateSubtaskOutputWithRetry()` - planning mode (multiple times)
- `multiTurnRepair()` - repair loop (up to 4 times)
- Each subtask in planning mode

**Total Instantiations for Complex Request:**
- Clarification: 1 provider instance
- Planning decomposition: 1 instance
- Each subtask generation: 1 instance × N subtasks
- Each repair attempt: 1 instance × 4 max attempts
- **Example:** 3 subtasks + 2 repairs = **8+ provider instantiations** for one user request!

**Recommended Fix:**
```typescript
// src/llm/providers/choose.ts
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";

// Singleton cache
let cachedProvider: OpenAIProvider | AnthropicProvider | null = null;
let cachedProviderType: string | null = null;

export function chooseProvider() {
  const providerType = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  
  // Return cached instance if provider hasn't changed
  if (cachedProvider && cachedProviderType === providerType) {
    return cachedProvider;
  }
  
  // Create new instance only when needed
  switch (providerType) {
    case "anthropic":
      cachedProvider = new AnthropicProvider();
      break;
    case "openai":
    default:
      cachedProvider = new OpenAIProvider();
      break;
  }
  
  cachedProviderType = providerType;
  return cachedProvider;
}

// Optional: Export for testing
export function resetProviderCache() {
  cachedProvider = null;
  cachedProviderType = null;
}
```

**Alternative Approach (Lazy Singleton per Class):**
```typescript
// openai.ts
export class OpenAIProvider {
  private static instance: OpenAIProvider | null = null;
  private client: OpenAI;
  private model: string;

  private constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    this.client = new OpenAI({ apiKey: key });
    this.model = process.env.LLM_MODEL || "gpt-4o-mini";
  }

  static getInstance(): OpenAIProvider {
    if (!OpenAIProvider.instance) {
      OpenAIProvider.instance = new OpenAIProvider();
    }
    return OpenAIProvider.instance;
  }

  // ... rest of methods
}
```

**Testing Requirements:**
- Verify same instance returned on multiple calls
- Test provider switching (env var change detection)
- Performance benchmark: before/after instantiation overhead
- Memory leak test (ensure singleton doesn't prevent garbage collection)

**Benefits:**
- ~5-10ms saved per LLM call
- Reduced memory allocation churn
- Better HTTP connection pooling
- Easier to add request batching later

---

### ISSUE-006: Hardcoded Plan Execution Timeout

**Severity:** MEDIUM  
**Impact:** Arbitrary time limit breaks complex projects, not configurable  
**Effort:** ~15 minutes  
**Status:** 🟡 Backlog

**Location:** `src/planning/executeTaskPlan.ts:62`

**Description:**
The task plan execution has a hardcoded 4-minute timeout (`MAX_PLAN_DURATION_MS = 4 * 60 * 1000`). This is described as "to avoid browser timeout" but is:
1. **Not configurable** - Can't adjust for complex projects
2. **Arbitrary** - No clear relationship to actual browser timeout (usually 5min+)
3. **Race condition prone** - Halts mid-execution, leaving partial state
4. **Misleading comment** - Browser timeout is client-side, this is server-side

**Current Code:**
```typescript
const MAX_PLAN_DURATION_MS = 4 * 60 * 1000; // 4 minutes total to avoid browser timeout
const MAX_CONSECUTIVE_FAILURES = 2; // Halt after 2 consecutive failures

export async function executeTaskPlan(
  plan: TaskPlan,
  context: PlanExecutionContext
): Promise<PlanExecutionResult> {
  // ...
  for (const subtaskId of executionOrder) {
    const elapsed = (context.now ? context.now() : Date.now()) - start;
    if (elapsed > MAX_PLAN_DURATION_MS) {
      halted = true;
      const note = `Plan execution halted after ${Math.round(elapsed / 1000)}s to avoid browser timeout. Completed ${completed.length}/${plan.subtasks.length} subtasks.`;
      console.warn(note);
      break; // ❌ Abrupt halt, partial state
    }
    // ...
  }
}
```

**Problems:**
1. **Breaks valid use cases:** Large refactoring projects legitimately need >4 minutes
2. **No configuration:** Can't disable or adjust timeout
3. **Poor error handling:** Halts mid-execution, files partially written
4. **Confusing reasoning:** Server-side timeout has nothing to do with browser timeout (which is handled by client/network layer)

**Real-World Scenarios:**
- **Complex API with auth:** Setup (1min) + Auth (1.5min) + Tests (1min) + Repair (2min) = **5.5 minutes needed**
- **Multi-service app:** Database setup, backend, frontend, integration = **6+ minutes**
- **Slow CI environments:** Docker builds, npm install, etc. can eat into time budget

**Recommended Fix:**
```typescript
// Make configurable via env var with sensible default
const DEFAULT_PLAN_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes default
const MAX_PLAN_DURATION_MS = process.env.PLAN_TIMEOUT_MS 
  ? parseInt(process.env.PLAN_TIMEOUT_MS, 10)
  : DEFAULT_PLAN_TIMEOUT_MS;

// Validate environment variable
if (isNaN(MAX_PLAN_DURATION_MS) || MAX_PLAN_DURATION_MS <= 0) {
  throw new Error(`Invalid PLAN_TIMEOUT_MS: ${process.env.PLAN_TIMEOUT_MS}`);
}

export async function executeTaskPlan(
  plan: TaskPlan,
  context: PlanExecutionContext
): Promise<PlanExecutionResult> {
  const start = context.now ? context.now() : Date.now();
  const timeoutMs = context.maxDurationMs ?? MAX_PLAN_DURATION_MS; // Allow override
  
  // ...
  for (const subtaskId of executionOrder) {
    const elapsed = (context.now ? context.now() : Date.now()) - start;
    if (elapsed > timeoutMs) {
      halted = true;
      const note = `Plan execution timeout after ${Math.round(elapsed / 1000)}s (limit: ${Math.round(timeoutMs / 1000)}s). Completed ${completed.length}/${plan.subtasks.length} subtasks.`;
      console.warn(note);
      
      // Return partial results with clear status
      return {
        status: "partial",
        subtaskResults: results,
        progress: tracker.getProgress(),
        totalDurationMs: elapsed,
        failedSubtasks: failed,
        completedSubtasks: completed,
        halted: true,
        haltReason: "timeout"
      };
    }
    // ...
  }
}
```

**Enhanced Solution - Progressive Timeout:**
```typescript
// Better approach: warn before timeout, allow graceful completion
const warningThreshold = timeoutMs * 0.8; // Warn at 80%

if (elapsed > warningThreshold && !warningSent) {
  console.warn(`Plan execution at ${Math.round(elapsed/timeoutMs * 100)}% of timeout. Remaining: ${Math.round((timeoutMs - elapsed)/1000)}s`);
  warningSent = true;
}

if (elapsed > timeoutMs) {
  // Check if current subtask is nearly done
  const currentSubtaskElapsed = Date.now() - subtaskStartTime;
  const allowGracefulCompletion = currentSubtaskElapsed > (elapsed - timeoutMs) * 0.5;
  
  if (!allowGracefulCompletion) {
    // Hard timeout
    break;
  }
  // Otherwise, let current subtask finish
}
```

**Configuration Recommendations:**
- `PLAN_TIMEOUT_MS=600000` (10 minutes) - production default
- `PLAN_TIMEOUT_MS=1800000` (30 minutes) - complex projects
- `PLAN_TIMEOUT_MS=0` - disable timeout (local development)

**Testing Requirements:**
- Unit test with mocked timer (fast-forward time)
- Verify timeout triggers at correct threshold
- Verify partial results returned correctly
- Integration test with real timeout scenario
- Verify env var parsing and validation

**Related Issues:**
- Should also apply similar configurability to `runInSandbox` timeout (currently 60s default)
- Consider per-subtask timeout instead of global plan timeout

---

## 📊 Summary Statistics

| Severity | Count | Total Effort |
|----------|-------|--------------|
| CRITICAL | 2 | ~50 min |
| HIGH | 3 | ~2h 45min |
| MEDIUM | 1 | ~15 min |
| **TOTAL** | **6** | **~3h 50min** |

---

## 🎯 Recommended Prioritization

1. **ISSUE-004** (Stream Errors) - **FIX IMMEDIATELY** - Will randomly crash production
2. **ISSUE-001** (Memory Leak) - **FIX IMMEDIATELY** - Will crash after sustained use
3. **ISSUE-002** (Path Traversal) - Security issue, must fix before public release
4. **ISSUE-005** (Provider Instantiation) - Performance improvement, medium priority
5. **ISSUE-003** (LLM Retry Logic) - Improves UX significantly
6. **ISSUE-006** (Hardcoded Timeout) - Low priority, affects edge cases

---

### ISSUE-007: Sensitive Artifacts Exposed via Static /output Serving

**Severity:** HIGH (Security)

**Impact:** Exposes internal artifacts (logs, metadata) publicly; information disclosure and potential abuse

**Effort:** ~30 minutes

**Status:** 🟡 Backlog

**Location:** `src/server.ts:117-118`

**Description:**
The server serves the entire `output/` directory via `express.static` with no access control or filtering. This exposes potentially sensitive files such as `_executor_meta.json`, raw test logs under `/logs`, and zip bundles. These artifacts can leak internal structure, filenames, test output, error details, and prompt metadata.

**Current Code:**
```typescript
app.use("/", express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.use("/output", express.static(OUTPUT_DIR, { extensions: ["html"] }));
```

**Recommended Fix:**
- Add a guard middleware before static to block sensitive files (JSON, logs, leading-underscore files).
- Disable dotfiles, set safe headers, and default to no-store caching for artifacts.

```typescript
// Block sensitive artifacts under /output
app.use("/output", (req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.includes("/logs/") || /\.(json|log|zip|txt)$/i.test(p) || p.endsWith("_executor_meta.json") || /\/(?:_|\.)[^/]+$/.test(p)) {
    return res.status(404).end();
  }
  return next();
});

app.use(
  "/output",
  express.static(OUTPUT_DIR, {
    extensions: ["html"],
    dotfiles: "ignore",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
    }
  })
);
```

**Testing Requirements:**
- Verify GET `/output/<slug>/_executor_meta.json` returns 404.
- Verify GET `/output/<slug>/logs/*.log` returns 404.
- Verify HTML/CSS/JS assets still serve correctly.
- Add regression test to ensure newly added artifact types remain blocked.

---

### ISSUE-008: Unbounded Memory Growth from Aggregating Test Logs

**Severity:** CRITICAL

**Impact:** Large test output can exhaust process memory; DoS risk under heavy output

**Effort:** ~45 minutes

**Status:** 🟡 Backlog

**Location:** `src/runner/runInSandbox.ts:90-149`

**Description:**
`combinedOutput` concatenates the entire child process stdout/stderr into a single string while also writing to disk. For large outputs, memory usage grows unbounded, risking OOM and process crashes.

**Current Code:**
```typescript
const logStream = createWriteStream(logFilePath, { encoding: "utf-8" });
let combinedOutput = "";
...
child.stdout?.on("data", chunk => {
  const text = chunk.toString();
  combinedOutput += text; // ❌ unbounded memory
  logStream.write(text);
});
child.stderr?.on("data", chunk => {
  const text = chunk.toString();
  combinedOutput += text; // ❌ unbounded memory
  logStream.write(text);
});
```

**Recommended Fix:**
- Track pass/fail counts incrementally while streaming (no need to keep full logs in memory).
- Keep only a small ring buffer for last N KB for diagnostics.

```typescript
const MAX_BUFFER_BYTES = 512 * 1024; // 512KB ring buffer
let tailBuffer = "";
let passCount = 0, failCount = 0;
const updateCounts = (line: string) => {
  const l = line.trim();
  if (/^Tests?\b/i.test(l)) {
    const pm = l.match(/(\d+)\s+passed/i); if (pm?.[1]) passCount = parseInt(pm[1], 10);
    const fm = l.match(/(\d+)\s+failed/i); if (fm?.[1]) failCount = parseInt(fm[1], 10);
  }
  const tap = l.match(/^#\s*(pass|fail)\s+(\d+)/i);
  if (tap) {
    if (tap[1].toLowerCase() === "pass") passCount = parseInt(tap[2], 10);
    if (tap[1].toLowerCase() === "fail") failCount = parseInt(tap[2], 10);
  }
};
const appendTail = (text: string) => {
  tailBuffer += text;
  if (tailBuffer.length > MAX_BUFFER_BYTES) {
    tailBuffer = tailBuffer.slice(tailBuffer.length - MAX_BUFFER_BYTES);
  }
};

child.stdout?.on("data", chunk => {
  const text = chunk.toString();
  appendTail(text);
  text.split(/\r?\n/).forEach(updateCounts);
  logStream.write(text);
});
child.stderr?.on("data", chunk => {
  const text = chunk.toString();
  appendTail(text);
  text.split(/\r?\n/).forEach(updateCounts);
  logStream.write(text);
});

// Later, use passCount/failCount and optionally persist tailBuffer separately if needed
```

**Testing Requirements:**
- Simulate >50MB stdout to confirm process memory stays bounded.
- Verify pass/fail counts computed correctly with streaming updates.
- Ensure logs still written fully to disk; only in-memory buffer is limited.

---

### ISSUE-009: Project Directory Contamination Across Runs (Stale Files)

**Severity:** HIGH

**Impact:** Old files persist between runs when reusing the same slug, causing nondeterministic tests and incorrect outputs

**Effort:** ~30 minutes

**Status:** 🟡 Backlog

**Location:** `src/server.ts:697-709`

**Description:**
When generating a project, the code writes into `output/<slug>/` without cleaning or using a unique run directory. Re-running with the same `projectName` reuses the same path, leaving stale files that can affect subsequent runs.

**Current Code:**
```typescript
const projectName = projectNameInput || output.project_name || "generated-project";
const slug = slugify(projectName, { lower: true, strict: true });
const targetRoot = path.join(OUTPUT_DIR, slug);
await fs.mkdir(targetRoot, { recursive: true });
// files are written into existing directory without cleanup
```

**Recommended Fix (choose one):**
- Ensure a clean directory before writing, or
- Use a unique per-run directory to avoid collisions.

```typescript
// Option A: Clean directory before writing (safer for determinism)
await fs.rm(targetRoot, { recursive: true, force: true });
await fs.mkdir(targetRoot, { recursive: true });

// Option B: Unique run directory (preserve history per project)
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runRoot = path.join(OUTPUT_DIR, slug, runId);
await fs.mkdir(runRoot, { recursive: true });
// Then use runRoot for writes and browsing
```

**Testing Requirements:**
- Run generation twice with the same `projectName` and different file sets; verify no stale files remain.
- Add test ensuring `_executor_meta.json` and logs reference the current run path correctly.

---

### ISSUE-010: Orphaned Subprocesses on Timeout (Process Group Not Terminated)

**Severity:** HIGH (Stability/Resource Leak)

**Impact:** On timeout, only the immediate child (shell wrapper) is killed. Descendant processes (e.g., test runner, spawned workers, browser processes) can survive, leaking CPU/file handles and causing nondeterministic behavior across runs.

**Effort:** ~60–90 minutes

**Status:** 🟡 Backlog

**Location:** `src/runner/runInSandbox.ts:126-139` (timeout/kill), `src/runner/runInSandbox.ts:127-133` (spawn options)

**Description:**
The sandbox uses `shell: true` and, on timeout, calls `child.kill("SIGKILL")`. This targets only the shell process. If the shell spawned the actual runner, those subprocesses may persist after the shell is killed. We need process-group termination on POSIX and a Windows-compatible fallback.

**Current Code:**
```typescript
const child = spawn(command, {
  cwd: projectRoot,
  env,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"]
});

let timedOut = false;
const timeoutHandle = setTimeout(() => {
  timedOut = true;
  child.kill("SIGKILL"); // ❌ only kills the immediate child
}, timeoutMs).unref();
```

**Recommended Fix:**
- Create a process group on POSIX (`detached: true`), then kill the entire group via negative PID.
- On Windows, use `taskkill /T /F /PID <pid>` to terminate the tree.
- Fallback to direct `child.kill("SIGKILL")` if group kill fails; log outcome.

```typescript
const isWin = process.platform === "win32";
const child = spawn(command, {
  cwd: projectRoot,
  env,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
  detached: !isWin // POSIX: new process group
});

function killTree(): void {
  try {
    if (isWin) {
      // Kill entire tree on Windows
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: true });
    } else if (child.pid) {
      // Kill process group on POSIX
      process.kill(-child.pid, "SIGKILL");
    }
  } catch {
    try { child.kill("SIGKILL"); } catch {}
  }
}

let timedOut = false;
const timeoutHandle = setTimeout(() => {
  timedOut = true;
  killTree();
}, timeoutMs).unref();
```

**Testing Requirements:**
- Add/extend integration test to spawn a long-running child (e.g., Node script with setInterval) and assert that after timeout, the process tree is terminated.
- Verify logs include a clear timeout and termination message; ensure no further log appends occur post-timeout.
- Confirm behavior on POSIX. For Windows, add conditional test or document skip with rationale in CI.

---

## Notes

- All issues identified during production readiness code review (2025-01-09)
- Fixes should follow CDI (Contract-Driven Integration) protocol
- Each fix requires discovery note + implementation + evidence
- Test coverage must be maintained above 89% line coverage threshold
- All changes must pass `npm run lint`, `npm run typecheck`, `npm test`