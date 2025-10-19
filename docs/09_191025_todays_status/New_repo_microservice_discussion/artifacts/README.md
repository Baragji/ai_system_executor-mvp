# Phase 0 Artifacts - AI Coding Platform

**Complete technical specifications extracted from Round 3 delivery**

This directory contains 100% complete, copy-paste-ready artifacts for Phase 0 (New Repository Scaffold) of the AI Coding Platform project.

## Structure

```
artifacts/
├── openapi/              # 5 complete OpenAPI 3.1 specs
│   ├── auth.yaml         # Auth & IAM (30+ endpoints, OAuth/WebAuthn/S2S)
│   ├── collab.yaml       # Realtime Collab (15+ endpoints + WebSocket)
│   ├── runner.yaml       # Code Runner (20+ endpoints, isolation, metrics)
│   ├── deployments.yaml  # Deployments/Environments (25+ endpoints)
│   └── evidence.yaml     # SBOM/SLSA/Attestations (15+ endpoints)
│
├── grafana/              # 4 complete Grafana dashboard JSONs
│   ├── bff-service-overview.json      # RED metrics (Request/Error/Duration)
│   ├── service-dependency-map.json    # Tempo service graph
│   ├── postgres-performance.json      # DB metrics & slow queries
│   └── runner-kpis.json               # Runner queue, success rate, usage
│
├── health/               # Health check TypeScript code
│   ├── shared.ts         # Reusable runChecks, httpCheck utilities
│   ├── auth.ts           # Auth service /healthz /readyz
│   ├── collab.ts         # Collab service health checks
│   ├── runner.ts         # Runner service health checks
│   ├── deployments.ts    # Deployments service health checks
│   ├── evidence.ts       # Evidence service health checks
│   └── bff.ts            # BFF/Gateway (checks all backends)
│
├── database/             # Database schema & migration strategy
│   ├── schema.sql        # Complete 11-table schema with cascades
│   ├── er-diagram.mmd    # Mermaid ER diagram
│   └── README.md         # golang-migrate setup & zero-downtime patterns
│
├── auth/                 # Service-to-service auth code
│   ├── s2s-client.ts     # OAuth Client Credentials client (BFF→Files)
│   └── s2s-server.ts     # JWT verification middleware (Files server)
│
├── infrastructure/       # Deployment & observability configs
│   ├── prometheus-alerts.yaml     # 5 critical alerts
│   ├── deployment-sequence.mmd    # 6-phase kubectl deployment
│   └── README.md                  # Usage instructions
│
└── README.md             # This file
```

## Validation

### OpenAPI Specs
```bash
npm install -g swagger-cli
swagger-cli validate openapi/auth.yaml
swagger-cli validate openapi/collab.yaml
swagger-cli validate openapi/runner.yaml
swagger-cli validate openapi/deployments.yaml
swagger-cli validate openapi/evidence.yaml
```

### TypeScript Code
```bash
npx tsc --noEmit health/*.ts auth/*.ts
# Note: Will show missing dependencies (pg, ioredis, etc.) - expected for standalone artifacts
```

### Grafana Dashboards
```bash
# Import via Grafana UI: Dashboards → Import → Upload JSON
# Or validate JSON structure:
jq empty grafana/*.json
```

### Database Schema
```bash
# Apply to PostgreSQL 16:
psql -f database/schema.sql
# Or via golang-migrate:
migrate -path database -database "$DATABASE_URL" up
```

## Usage in Phase 0 Contract

These artifacts are referenced by `00_phase0_new_repo_contract.json`:

1. **OpenAPI specs** → Copied to `services/*/openapi.yaml` in new repo
2. **Grafana dashboards** → Imported to Grafana in docker-compose stack
3. **Health checks** → Used in `packages/health` shared package
4. **Database schema** → Used in `database/migrations/001_init.up.sql`
5. **S2S auth** → Patterns used in BFF and backend services
6. **Infrastructure** → Referenced in K8s manifests and CI/CD

## Quality Standards

All artifacts meet Big Tech review criteria:

✅ **OpenAPI 3.1.0** with JSON Schema 2020-12  
✅ **RFC 9457** Problem Details for errors  
✅ **OAuth 2.1 + RFC 9068** JWT access tokens  
✅ **WebAuthn Level 3** for passkeys  
✅ **Kubernetes best practices** (health probes, rolling updates)  
✅ **Observability** (OpenTelemetry, Prometheus, Grafana, Tempo)  
✅ **Zero-downtime migrations** (expand-migrate-contract pattern)  
✅ **Cost-optimized** (R2 over S3, gVisor default)  

## Sources

All specifications based on:
- OpenAPI 3.1 spec (openapis.org)
- RFC 9457 Problem Details (rfc-editor.org)
- OAuth 2.1 + RFC 9068 JWT Profile
- Kubernetes 1.31 docs
- Grafana/Prometheus/Tempo best practices
- PostgreSQL 16 documentation
- golang-migrate patterns

## Next Steps

1. Use these artifacts in Phase 0 contract execution
2. AI dev (Codex) integrates into new monorepo scaffold
3. Phase 1: Implement Auth service using auth.yaml spec
4. Phase 2+: Implement remaining services

---

**Last Updated**: 2025-10-19  
**Contract**: 00_phase0_new_repo_contract.json  
**Source**: docs/09_191025_todays_status/New_repo_microservice_discussion/13_round_3.md
