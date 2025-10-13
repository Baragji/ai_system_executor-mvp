# Problem Types (RFC 9457)

**Effective:** Phase 19+ (2025-10-13)
**Enabled:** Default-on in dev/test, default-off in production
**RFC:** [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)

---

## Overview

All API errors return RFC 9457 problem details format when `PROBLEM_DETAILS_ENABLED=1` or `NODE_ENV=development|test`.

**Content-Type:** `application/problem+json`

---

## Base Problem Details Schema

```json
{
  "type": "https://api.executor-mvp.com/problems/{type}",
  "title": "Human-readable summary",
  "status": 400,
  "detail": "Detailed error description",
  "instance": "/api/endpoint",
  "occurred_at": "2025-10-13T10:00:00.000Z"
}
```

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | string (URI) | Problem type identifier | `"https://api.executor-mvp.com/problems/validation-error"` |
| `title` | string | Short, human-readable summary | `"Bad Request"` |
| `status` | number | HTTP status code (advisory) | `400` |
| `detail` | string | Human-readable explanation | `"The 'prompt' field is required."` |
| `instance` | string | URI reference to problem instance | `"/api/execute"` |

### Extension Fields

| Field | Type | Description |
|-------|------|-------------|
| `occurred_at` | string (ISO 8601) | Timestamp when error occurred |
| `trace_id` | string | OpenTelemetry trace ID (when OTel enabled) |
| `errors` | array | Validation errors with JSON Pointer (see below) |

**Note:** Extension field names MUST NOT contain colons (RFC 9457 §3.1).

---

## Problem Types

### 1. Validation Error

**Type URI:** `https://api.executor-mvp.com/problems/validation-error`
**Status:** `400 Bad Request`
**When:** Request body fails schema validation

#### Example

```json
{
  "type": "https://api.executor-mvp.com/problems/validation-error",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/execute",
  "occurred_at": "2025-10-13T10:00:00.000Z",
  "errors": [
    {
      "pointer": "#/prompt",
      "detail": "Required field missing"
    },
    {
      "pointer": "#/sessionId",
      "detail": "Must be a valid UUID"
    }
  ]
}
```

#### JSON Pointer Format

Validation errors use JSON Pointer (RFC 6901) to identify fields:

| Pointer | Meaning |
|---------|---------|
| `#/prompt` | Root-level `prompt` field |
| `#/config/maxRetries` | Nested field: `config.maxRetries` |
| `#/tasks/0/id` | First item in `tasks` array, `id` field |

**Helper function:**
```typescript
toValidationProblem("/api/execute", [
  { pointer: "#/prompt", detail: "Required" }
])
```

---

### 2. Not Found

**Type URI:** `about:blank` (generic)
**Status:** `404 Not Found`
**When:** Resource does not exist

#### Example

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Execution with ID 'abc123' does not exist",
  "instance": "/api/executions/abc123",
  "occurred_at": "2025-10-13T10:00:00.000Z"
}
```

**Note:** When `type` is `about:blank`, `title` SHOULD be the standard HTTP reason phrase ("Not Found", not "NotFound").

---

### 3. Unauthorized

**Type URI:** `about:blank` (generic)
**Status:** `401 Unauthorized`
**When:** Authentication required or failed

#### Example

```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "API key is missing or invalid",
  "instance": "/api/execute",
  "occurred_at": "2025-10-13T10:00:00.000Z"
}
```

---

### 4. Internal Server Error

**Type URI:** `about:blank` (generic)
**Status:** `500 Internal Server Error`
**When:** Unexpected server error

#### Example

```json
{
  "type": "about:blank",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred while processing your request",
  "instance": "/api/execute",
  "occurred_at": "2025-10-13T10:00:00.000Z"
}
```

**Security Note:** Do NOT leak stack traces or internal details in `detail`. Log full error internally only.

---

### 5. Graph Start Failed (Phase 19+)

**Type URI:** `https://api.executor-mvp.com/problems/graph-start-failed`
**Status:** `500 Internal Server Error`
**When:** LangGraph runtime fails to start when `AGENTS_RUNTIME=langgraph`

#### Example

```json
{
  "type": "https://api.executor-mvp.com/problems/graph-start-failed",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "LangGraph failed to start/execute",
  "instance": "/api/execute",
  "occurred_at": "2025-10-13T10:00:00.000Z",
  "details": {
    "graph_error": "Graph.js not implemented"
  }
}
```

---

## Client Integration

### TypeScript/JavaScript

```typescript
async function callAPI(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const contentType = res.headers.get('Content-Type');

    if (contentType?.includes('application/problem+json')) {
      const problem: ProblemDetails = await res.json();

      // Use structured error
      console.error(`${problem.title}: ${problem.detail}`);

      // Handle validation errors
      if (problem.errors) {
        problem.errors.forEach(err => {
          console.error(`  ${err.pointer}: ${err.detail}`);
        });
      }

      // Use HTTP status for control flow (not problem.status)
      if (res.status === 400) {
        // Handle validation error
      }
    } else {
      // Fallback for legacy JSON errors
      const data = await res.json();
      console.error(data.error || 'Unknown error');
    }

    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  occurred_at?: string;
  errors?: Array<{ pointer: string; detail: string }>;
  [key: string]: unknown;
}
```

### curl

```bash
# Request with Accept header
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -H "Accept: application/problem+json" \
  -d '{"prompt":"test"}' \
  -v

# Check response Content-Type
# < Content-Type: application/problem+json
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { toValidationProblem, toProblem } from '../src/middleware/problemDetails';

describe('RFC 9457 compliance', () => {
  it('generates problem details with correct structure', () => {
    const problem = toProblem(400, 'Bad Request', 'Missing prompt', '/api/execute');

    expect(problem).toMatchObject({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Missing prompt',
      instance: '/api/execute',
      occurred_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    });
  });

  it('generates validation problems with JSON Pointers', () => {
    const problem = toValidationProblem('/api/execute', [
      { pointer: '#/prompt', detail: 'Required' }
    ]);

    expect(problem.errors).toHaveLength(1);
    expect(problem.errors[0]).toMatchObject({
      pointer: '#/prompt',
      detail: 'Required'
    });
  });

  it('uses HTTP reason phrase for about:blank type', () => {
    const problem = toProblem(404, 'NotFound', 'Not found', '/api/foo');

    expect(problem.title).toBe('Not Found'); // Corrected to HTTP reason phrase
  });
});
```

### Integration Tests

```typescript
it('returns RFC 9457 problem details on 404', async () => {
  const res = await request(app)
    .get('/api/executions/invalid-id')
    .expect(404)
    .expect('Content-Type', /application\/problem\+json/);

  expect(res.body).toMatchObject({
    type: 'about:blank',
    title: 'Not Found',
    status: 404,
    detail: expect.any(String),
    instance: '/api/executions/invalid-id',
    occurred_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
  });

  // HTTP status must match problem.status
  expect(res.status).toBe(res.body.status);
});
```

---

## Feature Flag Behavior

| Environment | `PROBLEM_DETAILS_ENABLED` | Behavior |
|-------------|---------------------------|----------|
| Development | Auto (on) | Returns RFC 9457 problem details |
| Test | Auto (on) | Returns RFC 9457 problem details |
| Production | Auto (off) | Returns legacy `{ error: "..." }` format |
| Any | `1` or `true` | Force enable RFC 9457 |
| Any | `0` or `false` | Force disable RFC 9457 |

**Implementation:**
```typescript
function problemDetailsEnabled(): boolean {
  // Explicit override
  if (process.env.PROBLEM_DETAILS_ENABLED !== undefined) {
    return truthy(process.env.PROBLEM_DETAILS_ENABLED);
  }

  // Default-on in dev/test, default-off in prod
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  return nodeEnv === 'development' || nodeEnv === 'test';
}
```

---

## Migration Path

### Phase 1: Dev/Test Default (Current)

- ✅ RFC 9457 enabled by default in dev/test
- ✅ Tests validate problem details format
- ✅ UI updated to parse structured errors
- ⏳ Production still uses legacy format

### Phase 2: Client Readiness

- Update all API clients to:
  - Add `Accept: application/problem+json` header
  - Parse problem details response
  - Use HTTP status for control flow (not `problem.status`)
  - Handle validation errors array

### Phase 3: Production Rollout

- Enable `PROBLEM_DETAILS_ENABLED=1` in staging
- Validate no client breakage
- Enable in production via gradual rollout
- Monitor error rates

### Phase 4: Deprecate Legacy

- Remove legacy `{ error: "..." }` format
- Make RFC 9457 the only error format
- Update all documentation

---

## Best Practices

### DO ✅

- Use HTTP status codes correctly (400, 401, 404, 500, etc.)
- Keep `problem.status` in sync with HTTP status code
- Use JSON Pointer for validation errors
- Add `Accept: application/problem+json` in client requests
- Use `occurred_at` for timestamping (not `urn:ts`)
- Log full errors internally, expose safe messages in `detail`

### DON'T ❌

- Don't use colons in extension field names (`urn:ts` → `occurred_at`)
- Don't rely on `problem.status` for control flow (use HTTP status)
- Don't leak stack traces or internal details in `detail`
- Don't use `about:blank` with custom titles (mint specific type URIs)
- Don't skip `Content-Type: application/problem+json` header

---

## Resources

- **RFC 9457:** https://www.rfc-editor.org/rfc/rfc9457.html
- **JSON Pointer (RFC 6901):** https://www.rfc-editor.org/rfc/rfc6901.html
- **IANA Problem Types Registry:** https://www.iana.org/assignments/http-problem-types/
- **Middleware:** `src/middleware/problemDetails.ts`
- **Helper Functions:** `toProblem()`, `toValidationProblem()`, `respondWithProblem()`

---

## Future Enhancements

### Problem Type Documentation Pages

Host HTML pages at each problem type URI explaining:
- What triggers the error
- How to fix it
- Related documentation

**Example:** `https://api.executor-mvp.com/problems/validation-error` → HTML page with remediation guide

### IANA Registry Participation

Consider registering common problem types in IANA registry for wider adoption.

### Localization

Add `Content-Language` header and localized `title`/`detail` for i18n support.
