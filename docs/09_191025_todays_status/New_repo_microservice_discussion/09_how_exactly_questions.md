# "HOW EXACTLY" - Technical Implementation Research for GPT

**Context:** We have STRATEGY (personas, journeys, services) approved. Now we need **CONCRETE, CURRENT (Oct 2025) TECHNICAL SPECIFICATIONS** so AI assistants can build using CDI contracts without guessing or using outdated patterns.

**Critical Constraint:** I am non-technical. My AI assistants (Claude for contracts, Codex for implementation) will execute EXACTLY what you specify. If you're vague, they'll guess wrong. If you're outdated, they'll build deprecated tech. **I need 2025-current, production-ready, copy-paste-ready specifications.**

---

## 🚨 The "HOW EXACTLY" Problem

**Bad answer (generic guesswork):**
> "Use REST APIs with JSON. Store data in PostgreSQL. Use JWT for auth."

**Good answer (concrete, current, actionable):**
> "Use **OpenAPI 3.1** (released 2021, current spec Oct 2025) with **JSON Schema 2020-12** for request/response validation. Deploy **PostgreSQL 16.x** (current stable Oct 2025) with **Row-Level Security (RLS)** for multi-tenant isolation. Auth via **OAuth 2.1** (RFC 9068, replaces 2.0) with **JWT access tokens (RFC 9068 format)** + **refresh token rotation (RFC 6749 Section 10.4, best practice 2024+)**. Reference implementations: Supabase Auth (https://supabase.com/docs/guides/auth), Auth0 SDK 4.x (https://auth0.com/docs/quickstart/spa/react). Example OpenAPI contract: [paste actual YAML snippet]. Example RLS policy: [paste actual SQL]."

**See the difference?** The second answer is **build-ready TODAY** with current versions, RFCs, and examples.

---

## Questions for GPT (Each Requires 2025-Current Answers)

### 1. API Contract Specification (OpenAPI 3.1 Examples)

**Question:** Provide **complete, copy-paste-ready OpenAPI 3.1 YAML examples** for the BFF and core platform services, using **October 2025 best practices**.

**Required for EACH endpoint:**

#### A) BFF Service - Projects API
```yaml
# I need the EXACT OpenAPI 3.1 spec for these endpoints:
POST   /api/projects           # Create new project
GET    /api/projects           # List user's projects  
GET    /api/projects/{id}      # Get project details
PATCH  /api/projects/{id}      # Update project
DELETE /api/projects/{id}      # Delete project
POST   /api/projects/{id}/runs # Trigger AI run
GET    /api/projects/{id}/runs # List AI runs for project
```

**For each endpoint, specify:**
- **Request schema** (JSON Schema 2020-12 format, with examples)
- **Response schema** (success + all error cases using RFC 9457 Problem Details)
- **Auth requirements** (Bearer token? Scopes? Which OAuth scopes?)
- **Rate limits** (per user? per project? rate limit headers format?)
- **Pagination** (cursor-based? offset? what's the current best practice Oct 2025?)
- **Filtering/sorting** (query params format? JSON:API? GraphQL alternative?)
- **Idempotency** (idempotency keys for POST/PATCH? RFC reference?)
- **Versioning strategy** (URL versioning `/v1/`? Header-based? Content negotiation?)

**Evidence required:**
- Link to OpenAPI 3.1 specification (current version Oct 2025)
- Link to JSON Schema 2020-12 spec
- Link to RFC 9457 (Problem Details)
- Link to RFC 9068 (OAuth 2.1 JWT profile)
- Example from 2-3 production APIs doing this in 2025 (Stripe API v2025-10? GitHub API 2024-11? Supabase?)
- Paste actual YAML for at least 2 endpoints (not pseudocode)

---

#### B) Files/Storage Service API
```yaml
POST   /api/files              # Upload file (multipart or resumable?)
GET    /api/files/{id}         # Download file
DELETE /api/files/{id}         # Delete file
GET    /api/files?path={path}  # List files in directory
POST   /api/files/bulk-upload  # Batch upload
```

**Additional specs needed:**
- **Upload strategy:** Multipart form-data? Resumable uploads (TUS protocol)? Presigned URLs (S3-style)? What's production-ready Oct 2025?
- **Large file handling:** Chunked uploads? Streaming? Max file size?
- **Storage backend:** S3-compatible API? Which provider? (AWS S3, Cloudflare R2, MinIO?)
- **File metadata:** Extended attributes? Content-Type detection? Virus scanning hooks?
- **Collaborative editing integration:** How does CRDT sync tie into file storage? Real-time API vs polling?

**Evidence:**
- TUS resumable upload protocol (current version 2025)
- AWS S3 API reference (2025 features like S3 Express One Zone?)
- Cloudflare R2 compatibility (Oct 2025 feature set)
- Example from Google Drive API, Dropbox API, or Notion API (file handling patterns 2025)

---

#### C) Code Runner Service API
```yaml
POST   /api/runs               # Start code execution
GET    /api/runs/{id}          # Get run status
GET    /api/runs/{id}/logs     # Stream logs (WebSocket? SSE? HTTP streaming?)
POST   /api/runs/{id}/stop     # Kill running process
GET    /api/runs/{id}/artifacts # Download build artifacts
```

**Critical specs:**
- **Sandbox isolation:** gVisor? Kata Containers? Firecracker? Which is production-ready Oct 2025 and easiest to deploy?
- **Resource limits:** CPU/memory/disk quotas - how to specify in API? Kubernetes-style or Docker-style limits?
- **Log streaming:** WebSockets (Socket.IO? native WS?)? Server-Sent Events? HTTP/2 streaming? Which is current best practice 2025?
- **Timeout handling:** Max execution time? Graceful shutdown? Force kill?
- **Artifact storage:** Where do build outputs go? Link to Files service? Separate blob storage?
- **Language/runtime support:** How does API specify "run this as Node 20 vs Python 3.12"? Runtime manifest format?

**Evidence:**
- gVisor vs Kata vs Firecracker comparison (2025 state, production deployments)
- Kubernetes resource limits API (v1.29+ features as of Oct 2025)
- Replit Code Runner implementation (if public docs exist)
- GitHub Actions runner API (how they specify runtimes/limits)
- WebSocket vs SSE vs HTTP streaming - 2025 best practices (MDN, web.dev)

---

#### D) Realtime Collaboration Service API
```yaml
POST   /api/collab/documents         # Create collaborative document
GET    /api/collab/documents/{id}    # Get document state
WS     /api/collab/documents/{id}/ws # WebSocket for CRDT sync
GET    /api/collab/documents/{id}/presence # Get active users
```

**Critical specs:**
- **CRDT implementation:** Yjs? Automerge? Which is production-ready Oct 2025? Which has better TypeScript support?
- **Sync protocol:** Yjs sync protocol over WebSocket? Custom? How to handle reconnections?
- **Presence protocol:** How to broadcast cursor positions, selections, user info?
- **Conflict resolution:** Automatic via CRDT? Any edge cases?
- **Persistence:** How often to snapshot? Delta-based or full snapshots?
- **Offline support:** How does client handle offline→online transition?

**Evidence:**
- Yjs vs Automerge comparison (Oct 2025 state, npm downloads, GitHub activity)
- Liveblocks implementation examples (current 2025 API)
- Figma's CRDT approach (if documented)
- Notion's realtime sync architecture (if documented)
- Example WebSocket protocol spec from Yjs/Automerge docs

---

#### E) Auth & IAM Service API
```yaml
POST   /api/auth/register      # User signup
POST   /api/auth/login         # User login (OAuth 2.1? OIDC?)
POST   /api/auth/refresh       # Refresh access token
POST   /api/auth/logout        # Invalidate tokens
GET    /api/auth/me            # Get current user
POST   /api/auth/verify-email  # Email verification
POST   /api/auth/reset-password # Password reset
```

**Critical specs:**
- **Protocol:** OAuth 2.1 (RFC 9068)? OpenID Connect 1.0? Supabase Auth-style?
- **Token format:** JWT (which profile? RFC 9068? RFC 7519?)? Opaque tokens? Refresh token rotation?
- **Password hashing:** Argon2id? bcrypt? scrypt? Which is current best practice Oct 2025?
- **MFA support:** TOTP (RFC 6238)? WebAuthn (passkeys)? SMS (discouraged but required)?
- **Social login:** OAuth 2.0 flows for GitHub/Google/etc? Which providers? Which SDK versions?
- **Session management:** Stateless (JWT only)? Stateful (Redis session store)? Hybrid?
- **RBAC/ABAC:** How to model permissions? Casbin? OPA? Supabase RLS? PostgreSQL roles?

**Evidence:**
- OAuth 2.1 RFC 9068 (Oct 2025 adoption status)
- OWASP Password Storage Cheat Sheet (current 2025 recommendations)
- WebAuthn Level 3 spec (current browser support Oct 2025)
- Supabase Auth architecture (current 2025 version)
- Auth0 vs Clerk vs Supabase Auth comparison (Oct 2025 features/pricing)
- Example JWT structure (paste actual token with claims)

---

#### F) Deployments/Environments Service API
```yaml
POST   /api/environments          # Create environment (preview/staging/prod)
GET    /api/environments/{id}     # Get environment details
POST   /api/deployments           # Deploy to environment
GET    /api/deployments/{id}      # Get deployment status
POST   /api/deployments/{id}/rollback # Rollback deployment
GET    /api/deployments/{id}/logs # Deployment logs
```

**Critical specs:**
- **Environment model:** What's an "environment"? Container? VM? Serverless function? Kubernetes namespace?
- **Deployment strategy:** Blue-green? Canary? Rolling? Which is easiest for MVP?
- **Preview URLs:** How are they generated? Subdomain per preview? Path-based routing?
- **Health checks:** How to define? HTTP endpoint? Custom script?
- **Rollback mechanism:** Previous version snapshot? Git-based?
- **Zero-downtime:** How to ensure? Load balancer drain? Graceful shutdown?

**Evidence:**
- Vercel deployments API (current 2025 version)
- Netlify deploy API (current 2025 features)
- Render.com deployment model (if documented)
- Kubernetes deployment strategies (current best practices Oct 2025)
- Fly.io deployment API (current 2025 approach)

---

#### G) Evidence/Compliance Service API
```yaml
POST   /api/evidence/bundles      # Create evidence bundle
GET    /api/evidence/bundles/{id} # Get bundle (immutable, signed)
GET    /api/evidence/bundles/{id}/verify # Verify bundle integrity
POST   /api/sbom                  # Generate SBOM
POST   /api/provenance            # Generate SLSA provenance
```

**Critical specs:**
- **Evidence bundle format:** Custom JSON? DSSE envelope (SLSA)? How to sign?
- **Signing mechanism:** Ed25519? ECDSA? Which key management (KMS? Vault? Cosign?)
- **SBOM format:** SPDX 2.3? CycloneDX 1.6? Which is current standard Oct 2025?
- **SLSA provenance:** SLSA v1.0 (current Oct 2025)? Which level (L1/L2/L3)?
- **Storage:** Immutable blob store? Content-addressed? IPFS? S3 with object lock?
- **Verification API:** How to verify signature without trusting server? Client-side crypto?

**Evidence:**
- SLSA v1.0 specification (Oct 2025 current version)
- CycloneDX vs SPDX comparison (2025 adoption, tooling)
- Sigstore/Cosign for signing (current 2025 best practices)
- DSSE (Dead Simple Signing Envelope) spec
- Example SLSA provenance (paste actual JSON)
- Example SBOM (paste actual SPDX/CycloneDX)

---

### 2. Data Models & Database Schemas (Production-Ready Examples)

**Question:** Provide **complete, copy-paste-ready PostgreSQL 16.x schemas** for core entities, using **October 2025 best practices** (RLS, JSONB indexing, partitioning if needed).

**Required for each entity:**

#### A) Projects Table
```sql
-- Provide the EXACT CREATE TABLE statement with:
-- - All columns with appropriate types (UUID? BIGSERIAL? TEXT vs VARCHAR?)
-- - Indexes (B-tree? GIN for JSONB? Partial indexes?)
-- - Constraints (NOT NULL, UNIQUE, CHECK, FK)
-- - RLS policies for multi-tenancy
-- - Audit columns (created_at, updated_at, deleted_at for soft delete?)
-- - JSONB columns for flexible metadata? Or strict schema?
-- - Partitioning if needed (by tenant? by date?)

CREATE TABLE projects (
  -- SHOW ME THE ACTUAL SCHEMA
);
```

**Evidence:**
- PostgreSQL 16.x new features (Oct 2025 - what's new since 15?)
- Supabase RLS patterns (current 2025 examples)
- Multi-tenant schema design (shared schema vs schema-per-tenant - current best practice 2025)
- JSONB indexing strategies (GIN vs expression indexes - performance 2025)
- Soft delete patterns (deleted_at vs separate archive table - 2025 consensus)

---

#### B) Files Metadata Table
```sql
-- Files service database schema
CREATE TABLE files (
  -- Storage reference (S3 key? UUID?)
  -- File metadata (size, mime_type, hash for deduplication?)
  -- Relationships to projects/users
  -- Version tracking?
);
```

**Evidence:**
- S3-compatible storage patterns (how to reference blobs from DB 2025)
- File deduplication strategies (content-addressed storage)
- Version control in DB (temporal tables? event sourcing?)

---

#### C) Runs/Executions Table
```sql
CREATE TABLE runs (
  -- Execution metadata
  -- Status tracking (queued, running, success, failed, timeout)
  -- Resource usage tracking (CPU time, memory peak, etc.)
  -- Log references
  -- Artifact references
);
```

**Evidence:**
- State machine modeling in PostgreSQL (enum vs lookup table vs CHECK - 2025 best practice)
- Time-series data in Postgres (partitioning by time? TimescaleDB? Separate analytics DB?)

---

#### D) Users & Auth Tables
```sql
CREATE TABLE users (
  -- Supabase Auth schema? Custom? Which columns are standard 2025?
);

CREATE TABLE sessions (
  -- If stateful sessions, what's the schema?
  -- Or just rely on JWT (stateless)?
);
```

**Evidence:**
- Supabase Auth schema (current 2025 version)
- Auth0 vs Clerk data models (if self-hosting, what to replicate)

---

#### E) Evidence Bundles Table
```sql
CREATE TABLE evidence_bundles (
  -- Immutable records (INSERT only, no UPDATE/DELETE)
  -- Cryptographic hash for integrity
  -- Signature verification data
  -- References to SBOM/provenance/logs
);
```

**Evidence:**
- Append-only table patterns in Postgres (trigger to prevent UPDATE/DELETE?)
- Content-addressed storage in relational DB

---

#### F) Realtime Documents Table (CRDT State)
```sql
CREATE TABLE collab_documents (
  -- Yjs/Automerge state serialization
  -- Snapshot + deltas? Or full state only?
  -- Garbage collection strategy?
);
```

**Evidence:**
- Yjs persistence strategies (current 2025 patterns)
- Automerge storage backend examples

---

### 3. Error Handling & Observability (Concrete Implementations)

**Question:** Provide **copy-paste-ready RFC 9457 Problem Details examples** and **OpenTelemetry instrumentation code** for the BFF service (Node.js/TypeScript), using **October 2025 current SDKs**.

#### A) RFC 9457 Problem Details - All Error Types

**Provide JSON examples for:**
- 400 Bad Request (validation error with field-level details)
- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (insufficient permissions, which scope needed?)
- 404 Not Found (resource doesn't exist)
- 409 Conflict (idempotency key reused? Optimistic lock failed?)
- 422 Unprocessable Entity (business logic error, e.g., "can't delete project with active runs")
- 429 Too Many Requests (rate limit exceeded, when to retry?)
- 500 Internal Server Error (generic failure, incident ID for support)
- 503 Service Unavailable (dependency down, which service?)

**For each error type:**
```json
{
  "type": "https://api.example.com/problems/validation-error",  // URI to human-readable docs
  "title": "Validation Error",
  "status": 400,
  "detail": "Request body failed validation",
  "instance": "/api/projects/123",  // Which endpoint failed
  "errors": [  // Field-level validation errors
    {
      "field": "name",
      "message": "must be between 1 and 100 characters",
      "code": "STRING_LENGTH"
    }
  ],
  "trace_id": "abc123",  // OpenTelemetry trace ID for debugging
  "request_id": "req_xyz789"  // Per-request ID
}
```

**Evidence:**
- RFC 9457 spec (confirm still current Oct 2025)
- Express.js middleware example (2025 current patterns)
- NestJS exception filter example (if using NestJS)
- Stripe API error format (they follow RFC 9457 - current 2025 version)

---

#### B) OpenTelemetry Instrumentation (Node.js/TypeScript)

**Provide copy-paste-ready code for:**

```typescript
// 1. Initialize OpenTelemetry SDK (current Oct 2025 packages)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { /* SHOW ME CURRENT IMPORTS */ } from '@opentelemetry/...';

// What's the current setup for Oct 2025?
// Which exporters? (OTLP gRPC? HTTP? Jaeger native?)
// Which processors? (Batch? Simple?)
// Which propagators? (W3C Trace Context? B3?)

// 2. Auto-instrument Express/NestJS
// Show current auto-instrumentation packages Oct 2025

// 3. Manual span creation for custom logic
async function createProject(data: ProjectInput) {
  // How to create spans?
  // How to add attributes?
  // How to record errors?
  // How to link to parent spans?
}

// 4. Trace context propagation across services
// How to inject trace headers in HTTP calls?
// Which header format? (traceparent? X-B3-TraceId?)

// 5. GenAI spans for LLM calls (GPT-4, Claude, etc.)
// OpenTelemetry has GenAI semantic conventions - show current Oct 2025 usage
```

**Evidence:**
- OpenTelemetry JS SDK docs (current Oct 2025 version, breaking changes since last year?)
- GenAI semantic conventions (current Oct 2025 status - stable? experimental?)
- Example from production apps (Vercel? Netlify? Any public OTel examples?)
- Jaeger vs Tempo vs Honeycomb - which works best with OTel Oct 2025?

---

### 4. Authentication & Authorization (Production-Ready Implementation)

**Question:** Provide **copy-paste-ready code** for implementing OAuth 2.1 + JWT + RBAC, using **October 2025 current libraries** (Supabase Auth? Auth0 SDK? Clerk? Custom?).

#### A) Which Auth Provider/Library for October 2025?

**Evaluate current options:**
- **Supabase Auth** (self-hosted Postgres-based, free tier?)
- **Auth0** (managed, pricing model Oct 2025?)
- **Clerk** (managed, developer-friendly, pricing Oct 2025?)
- **Keycloak** (self-hosted, enterprise, complex?)
- **Ory Kratos** (self-hosted, lightweight, production-ready?)
- **Custom with Passport.js / jose library** (too much work? avoid?)

**For your recommendation, provide:**
- Deployment model (Docker Compose? Kubernetes Helm chart?)
- Integration code (Express middleware? NestJS guards?)
- Token verification (which library? `jose`? `jsonwebtoken`? provider SDK?)
- Example user flow (register → verify email → login → access protected route)

**Evidence:**
- Auth provider comparison (Oct 2025 features, pricing, developer experience)
- npm trends for auth libraries (Oct 2025 download stats)
- Security best practices (OWASP Auth Cheat Sheet 2025 version)

---

#### B) RBAC/ABAC Implementation

**How to model permissions?**

Option 1: **Role-Based Access Control (RBAC)**
```typescript
// User has roles: ["admin", "developer", "viewer"]
// Each role has permissions: admin can ["project:delete", "team:manage"]
// How to check permissions in middleware?
```

Option 2: **Attribute-Based Access Control (ABAC)**
```typescript
// Policy: user can delete project if user.id === project.owner_id OR user.role === "admin"
// Use OPA (Open Policy Agent)? Casbin? PostgreSQL RLS? Custom?
```

Option 3: **PostgreSQL Row-Level Security (RLS)**
```sql
-- Supabase-style: enforce permissions at DB layer
CREATE POLICY "Users can only see their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);
  
-- How to integrate with JWT claims?
```

**Which approach for October 2025? Provide:**
- Recommended strategy (RBAC? ABAC? RLS? Hybrid?)
- Code examples (middleware, policy definitions, DB setup)
- Performance implications (N+1 queries? Caching strategy?)

**Evidence:**
- Supabase RLS examples (current 2025 patterns)
- OPA vs Casbin comparison (Oct 2025 adoption, ease of use)
- OWASP RBAC/ABAC guidance (current 2025)

---

### 5. Frontend Tech Stack (Production-Ready Setup)

**Question:** Provide **copy-paste-ready setup** for Next.js 14+ with Monaco Editor + Yjs CRDT collaboration, using **October 2025 current packages**.

#### A) Project Scaffolding

```bash
# What's the current Oct 2025 command?
npx create-next-app@latest my-ide --typescript --app --tailwind

# Which additional packages?
npm install @monaco-editor/react yjs y-websocket ...

# What else is needed for production Oct 2025?
```

**Provide:**
- Exact package versions (or version ranges)
- `package.json` example with all dependencies
- `tsconfig.json` setup for strict TypeScript
- ESLint + Prettier config (current 2025 standards)
- Tailwind config (v3? v4 beta?)

---

#### B) Monaco Editor Integration

```typescript
// app/editor/page.tsx
'use client';

import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export default function EditorPage() {
  // SHOW ME THE CURRENT OCT 2025 SETUP
  // - How to initialize Yjs document?
  // - How to bind Monaco to Yjs?
  // - How to handle WebSocket connection?
  // - How to show presence (cursors, selections)?
  // - How to handle reconnection?
}
```

**Evidence:**
- `@monaco-editor/react` current version (Oct 2025, breaking changes?)
- Yjs + Monaco binding (which library? `y-monaco`? `@relm/yjs-monaco`?)
- Liveblocks examples (they have Monaco + Yjs examples - current 2025 version)
- Replit's open-source Monaco setup (if available)

---

#### C) CRDT Collaboration Setup

```typescript
// How to set up Yjs WebSocket provider?
// Server-side: y-websocket server setup (Node.js)
// Client-side: WebsocketProvider connection

// Which persistence backend for Yjs?
// - y-leveldb (local filesystem)?
// - y-redis (distributed)?
// - PostgreSQL custom adapter?

// Show me current Oct 2025 production-ready setup
```

**Evidence:**
- Yjs server deployment guide (Oct 2025 best practices)
- Liveblocks architecture (managed alternative - pricing/features Oct 2025)
- Automerge vs Yjs (2025 state, is Automerge stable now? Performance?)

---

#### D) WebSocket vs Server-Sent Events vs HTTP/2

**For realtime updates, which to use Oct 2025?**
- WebSockets (native? Socket.IO?)
- Server-Sent Events (simpler, one-way, current browser support?)
- HTTP/2 Server Push (deprecated? still viable?)
- WebTransport (new, production-ready Oct 2025?)

**Provide:**
- Recommendation with evidence
- Code example (client + server)
- Reconnection handling (backoff strategy?)
- Scaling considerations (sticky sessions? Redis adapter?)

**Evidence:**
- MDN WebSocket guide (updated 2025?)
- Socket.IO vs native WebSocket (2025 comparison)
- WebTransport browser support (Oct 2025 - Chrome? Firefox? Safari?)

---

### 6. Deployment & Infrastructure (Production-Ready Oct 2025)

**Question:** Provide **copy-paste-ready infrastructure setup** for deploying microservices with Docker Compose (dev) and Kubernetes (prod), using **October 2025 current tools**.

#### A) Docker Setup

```yaml
# docker-compose.yml for local development
# SHOW ME THE CURRENT OCT 2025 SETUP FOR:
# - PostgreSQL 16.x
# - Redis 7.x
# - BFF service (Node.js 20)
# - Files service
# - Code Runner (with gVisor/Firecracker isolation)
# - Realtime Collab (y-websocket server)
# - Observability stack (Jaeger/Tempo, Prometheus, Grafana)

services:
  postgres:
    image: postgres:16  # Current stable Oct 2025?
    # ...
```

**Evidence:**
- Docker Compose v3 best practices (Oct 2025)
- PostgreSQL Docker image updates (16.x current minor version?)
- Redis Docker setup (persistence? cluster mode for local dev?)

---

#### B) Kubernetes Deployment

```yaml
# k8s/bff-deployment.yaml
# SHOW ME CURRENT OCT 2025 BEST PRACTICES:
# - Deployment with HPA (Horizontal Pod Autoscaler)
# - Service + Ingress (NGINX? Traefik? Gateway API?)
# - ConfigMap + Secrets management (sealed-secrets? external-secrets? Vault?)
# - Health checks (liveness, readiness, startup probes)
# - Resource limits (how to set appropriately?)
# - Security context (non-root, read-only filesystem, etc.)

apiVersion: apps/v1
kind: Deployment
metadata:
  name: bff
spec:
  # ...
```

**Evidence:**
- Kubernetes 1.28+ features (current Oct 2025 version? 1.29? 1.30?)
- Ingress vs Gateway API (which is production-ready Oct 2025?)
- Secrets management comparison (sealed-secrets vs external-secrets vs Vault - 2025 consensus)

---

#### C) Service Mesh (Do We Need It?)

**Question:** For 9 microservices, do we need a service mesh (Istio? Linkerd? Cilium?) in October 2025, or is it overkill for MVP?

**If YES:**
- Which mesh? (Istio heavy, Linkerd lightweight, Cilium eBPF-based - 2025 recommendation)
- Deployment example (Helm chart? manifest?)
- What problems does it solve? (mTLS, observability, traffic splitting)

**If NO:**
- What's the alternative? (nginx ingress + manual mTLS? service-to-service auth tokens?)

**Evidence:**
- Service mesh adoption survey (2025 data)
- Istio vs Linkerd vs Cilium comparison (Oct 2025 features, complexity)
- When NOT to use a service mesh (complexity vs benefit)

---

#### D) CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml (if using GitHub Actions)
# SHOW ME CURRENT OCT 2025 BEST PRACTICES:
# - Monorepo path filtering (nx? turborepo? manual?)
# - Build Docker images (buildx? multi-platform?)
# - Run tests (Vitest? Jest?)
# - Generate SBOM (which tool? syft? trivy?)
# - Sign images (cosign? notation?)
# - Deploy to Kubernetes (kubectl? Helm? ArgoCD? FluxCD?)

name: Deploy BFF Service
on:
  push:
    branches: [main]
    paths:
      - 'services/bff/**'
jobs:
  # ...
```

**Evidence:**
- GitHub Actions current features (Oct 2025 - reusable workflows? composite actions?)
- Monorepo CI patterns (nx vs turborepo vs manual - 2025 state)
- Image signing (cosign current version? notation for OCI artifacts?)
- GitOps tools comparison (ArgoCD vs FluxCD - Oct 2025 features/adoption)

---

### 7. Testing Strategy (Concrete Examples)

**Question:** Provide **copy-paste-ready test examples** for unit, integration, and e2e tests, using **October 2025 current testing tools**.

#### A) Unit Tests (Vitest)

```typescript
// tests/unit/projects.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ProjectsService } from '@/services/projects';

describe('ProjectsService', () => {
  it('creates a new project', async () => {
    // SHOW ME CURRENT OCT 2025 PATTERNS:
    // - How to mock database calls? (Vitest vi.mock? Dependency injection?)
    // - How to assert types? (TypeScript + Vitest matchers?)
    // - How to test async code? (async/await best practices 2025?)
  });
});
```

**Evidence:**
- Vitest current version (Oct 2025 - any breaking changes since 1.x?)
- Vitest vs Jest (2025 performance, features, migration path)
- Mocking best practices (avoid over-mocking - current guidance)

---

#### B) Integration Tests (API Contract Testing with Pact)

```typescript
// tests/integration/bff-projects.pact.test.ts
import { PactV3 } from '@pact-foundation/pact';

describe('BFF → Projects Service Contract', () => {
  const provider = new PactV3({
    consumer: 'bff',
    provider: 'projects-service',
  });

  it('gets project by ID', () => {
    // SHOW ME CURRENT OCT 2025 PACT SETUP:
    // - How to define interactions?
    // - How to verify contracts in CI?
    // - How to publish to Pact Broker?
  });
});
```

**Evidence:**
- Pact current version (Oct 2025 - v3 stable? v4 beta?)
- Pact Broker setup (self-hosted? Pactflow managed?)
- Contract testing best practices (2025 guidance)

---

#### C) End-to-End Tests (Playwright)

```typescript
// tests/e2e/create-project.spec.ts
import { test, expect } from '@playwright/test';

test('non-technical founder creates project', async ({ page }) => {
  // SHOW ME CURRENT OCT 2025 PLAYWRIGHT PATTERNS:
  // - Login flow (how to handle auth?)
  // - API mocking (MSW? Playwright route interception?)
  // - Waiting strategies (avoid hardcoded waits - current best practice?)
  // - Screenshot/video on failure?
  // - Parallel execution?
  
  await page.goto('/new-project');
  // ...
});
```

**Evidence:**
- Playwright current version (Oct 2025 features)
- Playwright vs Cypress (2025 state, performance, DX)
- E2E testing best practices (avoid flaky tests - 2025 patterns)

---

### 8. Security Hardening (Concrete Checklist)

**Question:** Provide **actionable security checklist** for October 2025, with specific tools/configurations (not generic advice).

**Required:**

#### A) Dependency Scanning
- **Tool:** Snyk? Trivy? GitHub Dependabot? Which is current best Oct 2025?
- **Config:** Show `snyk test` or `trivy scan` command + CI integration
- **Policy:** Fail build on high/critical vulnerabilities? Or just warn?

#### B) SAST (Static Analysis)
- **Tool:** SonarQube? Semgrep? CodeQL? Which for TypeScript/Node.js Oct 2025?
- **Config:** Show `.sonarqube.yml` or GitHub CodeQL workflow
- **Rules:** Default ruleset? OWASP Top 10 focused?

#### C) Container Image Scanning
- **Tool:** Trivy? Grype? Clair? Which is current standard Oct 2025?
- **Config:** Show Dockerfile best practices (multi-stage, non-root, minimal base image)
- **Policy:** Fail on vulnerabilities? Allowed CVEs?

#### D) Secret Scanning
- **Tool:** Gitleaks? TruffleHog? GitHub secret scanning? Current Oct 2025 recommendation?
- **Config:** Pre-commit hook? CI check?

#### E) Runtime Security
- **Tool:** Falco? Tracee? Which for Kubernetes Oct 2025?
- **Config:** Show Falco rules for detecting suspicious activity

#### F) Network Policies
```yaml
# Kubernetes NetworkPolicy example
# - Default deny all
# - Allow only necessary service-to-service communication
# - Allow ingress from gateway only
```

**Evidence:**
- OWASP DevSecOps guidelines (2025 version)
- CIS Kubernetes Benchmark (current Oct 2025 version)
- Tool comparison (Snyk vs Trivy vs Grype - 2025 features/cost)

---

## Expected Output Format

For EACH question above, GPT must provide:

1. ✅ **Direct answer** (recommended approach with current Oct 2025 tech)
2. 📋 **Copy-paste-ready code/config** (YAML, TypeScript, SQL, bash commands)
3. 🔗 **Evidence links** (3+ sources: official docs, RFCs, production examples)
4. ⚠️ **Trade-offs** (what you gain/lose with this choice vs alternatives)
5. 📊 **Comparison table** (if multiple options, show feature/complexity/cost matrix)
6. 🎯 **When outdated** (explicitly state if something was best practice 6 months ago but not anymore)

---

## Anti-Patterns to Avoid (Call Out GPT If He Does This)

❌ **Vague answer:** "Use a database" → Should be: "Use PostgreSQL 16.2 with RLS, here's the schema..."

❌ **Outdated:** "Use OAuth 2.0" → Should be: "Use OAuth 2.1 (RFC 9068, supersedes 2.0 as of 2024)"

❌ **No code:** "Set up OpenTelemetry" → Should be: "Here's the exact code: `import { NodeSDK } from '@opentelemetry/sdk-node'...`"

❌ **No sources:** "This is best practice" → Should be: "Per OWASP 2025 guidelines (link), use Argon2id..."

❌ **Generic examples:** `TODO: implement this` → Should be: Actual working code

❌ **Missing versions:** "Install Node.js" → Should be: "Install Node.js 20.18.0 LTS (current Oct 2025)"

---

## Why This Matters

**I am non-technical.** I will hand GPT's answers DIRECTLY to AI assistants (Claude, Codex) who will:
1. Create CDI contracts based on these specs
2. Generate code exactly as specified
3. NOT second-guess or fill in gaps

If GPT says "use JWT," Claude will implement JWT **exactly as shown in the example**.
If GPT's example is from 2023, Claude will build with 2023 patterns.
If GPT doesn't specify package versions, Claude will guess (often wrong).

**Therefore:** GPT must provide **October 2025 production-ready, copy-paste-ready, fully-specified answers** or the entire system will be built on outdated/wrong foundations.

---

## TL;DR for GPT

**"I need CONCRETE, COPY-PASTE-READY technical specifications (OpenAPI contracts, database schemas, code examples, configs) using OCTOBER 2025 CURRENT tools/versions/best practices. No generic advice, no outdated patterns, no 'figure it out yourself.' Provide exact code, exact configs, exact commands, exact package versions, and 3+ sources per claim. I will hand your answers to AI assistants who will build EXACTLY what you specify, so be specific and current."**

**Questions cover:**
1. OpenAPI 3.1 contracts (7 services, all endpoints, current 2025 patterns)
2. Database schemas (PostgreSQL 16.x, RLS, indexes, all tables)
3. Error handling (RFC 9457 examples, OpenTelemetry setup Oct 2025)
4. Auth implementation (OAuth 2.1, JWT, RBAC/RLS, current 2025 libs)
5. Frontend setup (Next.js 14+, Monaco, Yjs, Oct 2025 packages)
6. Infrastructure (Docker Compose, Kubernetes, CI/CD, Oct 2025 tools)
7. Testing (Vitest, Pact, Playwright, Oct 2025 patterns)
8. Security (SAST, scanning, policies, Oct 2025 tools)

**Format:** Code snippets, config files, schemas, commands - all copy-paste-ready with sources.

---

**Status:** Ready to send to GPT  
**Priority:** CRITICAL (defines implementation correctness)  
**Expected Response Time:** 2-4 hours (massive research + code generation)  
**Validation:** I will review for vagueness/outdated patterns before accepting
