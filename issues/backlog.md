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

## Notes

- All issues identified during production readiness code review (2025-01-09)
- Fixes should follow CDI (Contract-Driven Integration) protocol
- Each fix requires discovery note + implementation + evidence
- Test coverage must be maintained above 89% line coverage threshold
- All changes must pass `npm run lint`, `npm run typecheck`, `npm test`