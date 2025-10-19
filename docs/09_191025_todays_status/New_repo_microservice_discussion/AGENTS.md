# AI Coding Platform — Repository Instructions for AI Agents

**Last Updated:** 2025-10-19  
**Repository:** ai-coding-platform (NEW)  
**Enforcement:** This file is protected. Changes require approval.

---

## Current Work

- **Active Phase**: Phase 0 (Foundation Scaffold)
- **Contract**: `00_phase0_new_repo_contract.json`
- **Status**: Pre-execution (scaffolding not yet started)
- **Context**: Complete technical specs in `13_round_3.md` (100% complete, Big Tech approved)
- **Artifacts**: `artifacts/` directory with 24 production-ready files

---

## Quick Status Check

```bash
# Phase 0: Not yet applicable (repo being scaffolded)
# After Phase 0 complete, use:
git status                  # Check working tree
npm run validate:all        # Run all validations
docker-compose ps           # Check infrastructure health
```

---

## Stack & Constraints

### Allowed Technology
- **Language:** TypeScript/JavaScript ONLY
- **Runtime:** Node.js 20.x LTS
- **Backend:** Express.js / NestJS for services
- **Frontend:** Next.js 15.5 + React 19 (in `services/frontend` only)
- **Database:** PostgreSQL 16.x
- **Cache:** Redis 7.x
- **Testing:** Vitest with 80% line coverage, 75% branch coverage
- **Linting:** ESLint with zero warnings
- **Observability:** OpenTelemetry → Grafana Alloy → Tempo/Loki/Prometheus/Grafana

### Forbidden Technology
- ❌ **No Python** anywhere in this project
- ❌ **No frontend frameworks** outside `services/frontend` (no React in `/public`)
- ❌ **No new dependencies** without explicit justification
- ❌ **No breaking changes** to existing APIs without migration path

---

## Architecture Overview

### Service Boundaries (12 Services)

**Platform Layer (9 services)**:
1. **frontend** - Next.js 15.5 UI (SSR + Monaco editor)
2. **bff** - Backend-for-Frontend (GraphQL gateway, HTTP → services)
3. **auth** - Auth & IAM (OAuth 2.1, WebAuthn, S2S JWT)
4. **projects** - Projects & metadata management
5. **files** - File storage & versioning (R2/S3 backend)
6. **runner** - Code execution (gVisor/Firecracker isolation)
7. **collab** - Realtime collaboration (Yjs, WebSocket)
8. **deployments** - Environments & deployment orchestration
9. **evidence** - SBOM, SLSA provenance, attestations

**AI System Layer (3 services)** - Phase 1+:
10. **mca** - Multi-Context Aggregator (orchestrator)
11. **agent-workers** - Agent execution pool
12. **test-eval** - Test generation & evaluation

### Technology Decisions

| Component | Technology | Reasoning |
|-----------|-----------|-----------|
| Runtime | Node.js 20.x LTS | Latest stable, native WASM, top-level await |
| Language | TypeScript 5.6.3 | Type safety, IDE support, satisfies keyword |
| API Specs | OpenAPI 3.1.0 | JSON Schema 2020-12, webhooks, better anyOf |
| Auth | OAuth 2.1 + RFC 9068 | Refresh token rotation, JWT access tokens |
| Passkeys | WebAuthn Level 3 | Conditional UI, PRF extension |
| DB | PostgreSQL 16 | JSONB, RLS, full-text search, LISTEN/NOTIFY |
| Cache | Redis 7.x | Pub/sub, streams, session storage |
| Isolation | gVisor (default) | Balance security/performance, Firecracker opt-in |
| Storage | Cloudflare R2 | $0 egress, S3-compatible, 10x cheaper |
| CDN | Cloudflare CDN | Integrated with R2, DDoS protection |
| Observability | OpenTelemetry | Vendor-neutral, GenAI semantic conventions |
| Metrics | Prometheus | Industry standard, PromQL |
| Traces | Grafana Tempo | Parquet backend, TraceQL |
| Logs | Grafana Loki | LogQL, labels, no indexing overhead |
| Dashboards | Grafana 11.x | Unified observability UI |

---

## Discovery-First Protocol

Before making ANY code changes:

1. **Discover Integration Points**
   - Identify exact file + line + function where code will integrate
   - Document current implementation with code snippets (±10 lines)
   - List all dependencies and potential impacts
   - Verify stack compliance against `AGENTS.md` (this file)

2. **Create Discovery Note**
   - Output: `.automation/phase*_discovery.json` and `.md`
   - Must include: integration points, snippets, justification, compliance check
   - Review discovery note before proceeding

3. **No Assumptions**
   - Never assume file structure or function names
   - Always grep/search to find actual locations
   - Document what you found, not what you expected

---

## Commands (Run These Exactly)

### Validation Commands (Must Pass Before Merge)
```bash
npm run lint              # ESLint - must exit 0, no warnings
npm run typecheck         # TypeScript - must exit 0
npm test                  # Vitest - must exit 0, coverage thresholds met
npm run validate:openapi  # OpenAPI validation - must exit 0
npm run sbom              # Generate SPDX SBOM artifact
npm run sbom:cyclonedx    # Generate CycloneDX SBOM
npm run sbom:all          # Generate both SPDX + CycloneDX
npm run provenance        # Generate SLSA v1.0 provenance
```

### Build & Run
```bash
npm run build             # TypeScript compilation (all services)
npm run dev               # Start all services via docker-compose
npm test -- --watch       # Test watch mode
docker-compose ps         # Check service health
```

---

## Evidence Requirements

Every PR must include:

1. **Discovery Note**
   - Path: `.automation/phase*_discovery_note.md`
   - Contents: Integration points with code snippets
   - Justification for chosen approach

2. **Test Evidence**
   - All tests passing (exit 0)
   - Coverage thresholds met (≥80% line, ≥75% branch)
   - No skipped tests without explanation

3. **OpenAPI Validation**
   - `npm run validate:openapi` passes
   - All specs validate against OpenAPI 3.1.0 schema

4. **SBOM Artifacts**
   - SPDX: Generated via `npm run sbom` → `sbom.spdx.json`
   - CycloneDX: Generated via `npm run sbom:cyclonedx` → `sbom.cdx.json`
   - SLSA Provenance: Generated via `npm run provenance` → `provenance.intoto.jsonl`

5. **Error Handling**
   - Use RFC 9457 problem details for all API errors
   - Test error responses (400, 401, 403, 404, 500)

6. **Stack Compliance**
   - No forbidden file extensions (.py, etc.)
   - Frontend changes only under `services/frontend/`
   - No new frameworks introduced without approval

---

## Protected Files (Approval Required)

Changes to these require explicit human approval:
- `AGENTS.md` (this file)
- `CDI_INFRASTRUCTURE.md`
- `.github/workflows/*`
- `contracts/schemas/*`
- `00_phase0_new_repo_contract.json`

---

## Anti-Drift Rules

### DO
✅ Follow patterns established in artifacts  
✅ Add tests for all new functionality  
✅ Document integration points before changing code  
✅ Run all validation commands before creating PR  
✅ Keep changes focused and minimal  
✅ Use OpenAPI specs as source of truth for APIs  
✅ Use health check patterns from `artifacts/health/`  

### DON'T
❌ Add Python code for any reason  
❌ Introduce frontend frameworks outside `services/frontend/`  
❌ Make breaking changes to APIs without migration path  
❌ Skip discovery phase  
❌ Commit without passing all validations  
❌ Modify protected files without approval  
❌ Deviate from OpenAPI specs  

---

## Quality Standards

### Code Quality
- **Coverage:** 80% line, 75% branch minimum
- **Warnings:** Zero tolerance
- **Errors:** Must fix before PR
- **Style:** ESLint enforced automatically
- **TypeScript:** Strict mode enabled (`"strict": true`)

### API Quality
- **OpenAPI 3.1.0:** All endpoints documented
- **RFC 9457:** Problem details for errors
- **OAuth 2.1:** Refresh token rotation, PKCE required
- **RFC 9068:** JWT access tokens with structured claims
- **Cursor Pagination:** For all list endpoints (no offset/limit)

### Contract Quality
- **Validation:** Must pass schema check
- **Completeness:** All required fields present
- **Evidence:** All claims backed by artifacts
- **Traceability:** Clear decision reasoning

---

## Execution Flow

1. **Phase Verification** → Confirm prerequisites complete
2. **Discovery Phase** → Map integration points (mandatory)
3. **Win Implementation** → Execute with discovered integration points
4. **Evidence Collection** → Generate all required artifacts
5. **Validation Gate** → All checks pass before merge

---

## Error Handling

If any step fails:

1. **HALT immediately** - do not proceed
2. **Document the failure** in `.automation/phase*_trace.jsonl`
3. **Report to human** with diagnostic info
4. **Wait for guidance** - no assumptions

---

## Integration Guidelines

### Frontend Changes (`services/frontend/*`)
- Next.js 15.5 + React 19 app router
- Tailwind v4 for styling
- Monaco Editor for code editing
- Test in browser manually before marking complete
- Verify no console errors

### Backend Changes (`services/*`, `packages/*`)
- TypeScript with full type safety
- Unit tests required for all functions
- Integration tests for API endpoints
- Error handling on all async operations
- Health checks at `/healthz` (liveness) and `/readyz` (readiness)

### OpenAPI Changes (`services/*/openapi.yaml`)
- Requires approval (source of truth)
- Must be backwards compatible
- Validate against OpenAPI 3.1.0 schema
- Document breaking changes with migration guide

### Database Changes (`database/migrations/*`)
- Use golang-migrate
- Zero-downtime patterns (expand-migrate-contract)
- Must have `up` and `down` migrations
- Test rollback before committing

---

## Service-to-Service Auth

All inter-service calls use OAuth 2.0 Client Credentials (RFC 6749) with JWT access tokens (RFC 9068):

### Client Side (e.g., BFF → Files)
```typescript
import { S2SClient } from '@ai-platform/auth-s2s';

const client = new S2SClient({
  clientId: process.env.BFF_CLIENT_ID,
  clientSecret: process.env.BFF_CLIENT_SECRET,
  tokenEndpoint: 'http://auth:8080/oauth2/token',
});

const token = await client.getAccessToken();
const response = await fetch('http://files:8080/files', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Server Side (e.g., Files service)
```typescript
import { verifyS2SToken } from '@ai-platform/auth-s2s';

app.use(async (req, res, next) => {
  const claims = await verifyS2SToken(req.headers.authorization);
  req.serviceId = claims.client_id; // "bff", "runner", etc.
  next();
});
```

See `artifacts/auth/` for complete implementations.

---

## Health Checks

Every service must implement:

### Liveness Probe (`/healthz`)
```typescript
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

### Readiness Probe (`/readyz`)
```typescript
import { runChecks } from '@ai-platform/health';

app.get('/readyz', async (req, res) => {
  const checks = {
    postgres: () => checkPostgres(),
    redis: () => checkRedis(),
    authService: () => httpCheck('http://auth:8080/healthz'),
  };
  
  const results = await runChecks(checks);
  const allHealthy = Object.values(results).every(r => r.healthy);
  res.status(allHealthy ? 200 : 503).json(results);
});
```

See `artifacts/health/` for complete implementations.

---

## Observability

### OpenTelemetry Instrumentation

All services auto-instrument with:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Grafana Dashboards

Import dashboards from `artifacts/grafana/`:
- `bff-service-overview.json` - RED metrics (Request/Error/Duration)
- `service-dependency-map.json` - Tempo service graph
- `postgres-performance.json` - DB metrics
- `runner-kpis.json` - Runner queue & execution metrics

### Prometheus Alerts

Load alerts from `artifacts/infrastructure/prometheus-alerts.yaml`:
- High error rate (>5% for 5m)
- High latency (p95 >1s for 5m)
- DB connection pool exhaustion (>90% for 2m)
- Runner queue backlog (>100 for 10m)

---

## When In Doubt

1. **Stop and ask** - don't guess
2. **Check AGENTS.md** for constraints
3. **Review artifacts** for patterns to follow
4. **Check OpenAPI specs** for API contracts
5. **Run validation commands** to catch issues early
6. **Read existing code** for established patterns

---

**Remember:** Quality over speed. Ship perfect or never.

---

## Contact & Governance

- **Owner:** @yousefbaragji
- **Protected Files:** Require approval
- **Stack Drift:** Automatically rejected by CI
- **Evidence Missing:** PR blocked until artifacts present

This file enforces the Contract-Driven Integration (CDI) pattern for AI-powered development of the AI Coding Platform.
