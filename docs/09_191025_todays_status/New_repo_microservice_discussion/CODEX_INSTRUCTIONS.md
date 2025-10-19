# Codex Execution Instructions - Phase 0: AI Coding Platform

**Date**: 2025-10-19  
**Repository**: ai-coding-platform (NEW - to be created)  
**Phase**: Phase 0 - Foundation Scaffold  
**Contract**: `00_phase0_new_repo_contract.json`

---

## Mission

You are Codex, an AI dev agent tasked with scaffolding a new monorepo for an AI-powered coding platform following Contract-Driven Integration (CDI) methodology.

---

## Step 1: Context Acquisition (READ EVERYTHING)

### 1.1 Read Non-Artifact Files (Understanding Phase)

**Purpose**: Understand the complete vision, architecture decisions, and rationale behind Phase 0.

Read these files in order:

1. **`VISION_CHEAT_SHEET.md`** - Product vision, user persona, value props
2. **`01_microservices_first_architecture.md`** - Why microservices (not monolith)
3. **`02_architecture_refinement.md`** - Service boundaries refined
4. **`03_approval_of_claims.md`** - Architecture validation (Big Tech review)
5. **`04_stack_selection_october_2025.md`** - Technology choices (Node 20, TypeScript 5.6, etc.)
6. **`05_database_schema_design.md`** - DB rationale, RLS, cascades
7. **`06_observability_strategy.md`** - OpenTelemetry, Grafana stack
8. **`07_security_architecture.md`** - OAuth 2.1, WebAuthn, S2S auth
9. **`08_user_experience.md`** - Non-technical founder persona, UI/UX requirements
10. **`09_cost_optimization.md`** - R2 over S3, gVisor default, cost model
11. **`10_the_how_delivery.md`** - Initial technical specs (Round 1 - 77% complete)
12. **`11_refinement_round2_critical_gaps.md`** - Gap analysis
13. **`12b_round_two_version2.md`** - Round 2 specs (90-95% complete)
14. **`13_round_3.md`** - **FINAL specs (100% complete)** - your source of truth

**Action**: After reading, create a mental map of:
- Why this architecture exists (not just what it is)
- Trade-offs made (e.g., R2 vs S3, gVisor vs Firecracker)
- Quality bars (Big Tech standards, RFC compliance)

---

### 1.2 Read CDI Governance Files

15. **`CDI_INFRASTRUCTURE.md`** - CDI methodology, contract structure, validation rules
16. **`AGENTS.md`** - AI agent instructions (THIS FILE - customized for new repo)

**Action**: Internalize CDI rules:
- Discovery-first protocol (no assumptions)
- Evidence requirements (tests, validation, SBOM)
- Anti-drift rules (no Python, no frontend frameworks, etc.)
- Quality standards (80% coverage, zero warnings)

---

## Step 2: Contract Validation

### 2.1 Read Phase 0 Contract

17. **`00_phase0_new_repo_contract.json`**

**Action**: Validate contract against CDI schema:
```bash
# In new repo root (after copying files):
npm install -g ajv-cli
ajv validate -s contracts/schemas/phase-contract.schema.json -d 00_phase0_new_repo_contract.json
```

**Check**:
- ✅ All required fields present (`phaseId`, `dependencies`, `wins`, `mustPass`, etc.)
- ✅ 18 wins defined with clear acceptance criteria
- ✅ 12 `mustPass` validation commands
- ✅ Exit criteria unambiguous

**If validation fails**: STOP and report errors. Do NOT proceed.

---

### 2.2 CDI Compliance Audit

**Check Phase 0 contract for**:

1. **Discovery Protocol Compliance**
   - Does contract require discovery before implementation? ✅ (Step 1: repo init)
   - Are integration points documented? ✅ (OpenAPI specs, health checks)

2. **Evidence Requirements**
   - Are all wins measurable? ✅ (mustPass commands prove completion)
   - Are artifacts specified? ✅ (OpenAPI specs, Grafana dashboards, etc.)

3. **Stack Compliance**
   - TypeScript/JavaScript only? ✅ (Node 20.x, TypeScript 5.6.3)
   - No forbidden tech? ✅ (No Python, no React in wrong places)

4. **Quality Standards**
   - Coverage thresholds? ✅ (80% line, 75% branch - in mustPass)
   - Lint/typecheck required? ✅ (ESLint, tsc in mustPass)

**If any check fails**: Document gaps, propose fixes, wait for human approval.

---

## Step 3: Artifact Validation

### 3.1 Read All Artifacts

Navigate to `artifacts/` directory:

```
artifacts/
├── openapi/          # 5 OpenAPI 3.1 specs
├── grafana/          # 4 Grafana dashboard JSONs
├── health/           # 7 TypeScript health check files
├── database/         # 3 files (schema.sql, ER diagram, migration guide)
├── auth/             # 2 TypeScript S2S auth files
└── infrastructure/   # 3 files (Prometheus alerts, deployment sequence, README)
```

**Action**: Read each file, understand its purpose from `artifacts/README.md`.

---

### 3.2 Map Artifacts to Discussion

**For each artifact, verify**:

1. **OpenAPI Specs** (`openapi/*.yaml`)
   - Maps to Round 3 specs in `13_round_3.md` Section 1? ✅
   - OAuth 2.1 compliance per `07_security_architecture.md`? ✅
   - RFC 9457 problem details per `04_stack_selection_october_2025.md`? ✅
   - All endpoints have security schemes defined? ✅

2. **Grafana Dashboards** (`grafana/*.json`)
   - Maps to Round 3 Section 2? ✅
   - Aligns with `06_observability_strategy.md` (OTEL, Tempo, Prometheus)? ✅
   - Metrics match service instrumentation patterns? ✅

3. **Health Checks** (`health/*.ts`)
   - Maps to Round 3 Section 4? ✅
   - Follows `/healthz` (liveness) and `/readyz` (readiness) pattern? ✅
   - Dependencies match deployment sequence in `infrastructure/deployment-sequence.mmd`? ✅

4. **Database Schema** (`database/schema.sql`)
   - Maps to Round 3 Section 3? ✅
   - Aligns with `05_database_schema_design.md` (RLS, cascades, audit trail)? ✅
   - 11 tables present with correct relationships? ✅

5. **S2S Auth** (`auth/*.ts`)
   - Maps to Round 3 Section 7? ✅
   - Implements OAuth Client Credentials per `07_security_architecture.md`? ✅
   - Uses RFC 9068 JWT format? ✅

6. **Infrastructure** (`infrastructure/*.yaml`, `*.mmd`)
   - Prometheus alerts map to Round 3 Section 5? ✅
   - Deployment sequence matches service dependencies? ✅
   - Health check dependencies documented? ✅

**If mapping fails**: Document discrepancies, propose fixes.

---

### 3.3 Technical Validation

Run validation commands from `artifacts/README.md`:

```bash
# OpenAPI validation
swagger-cli validate artifacts/openapi/auth.yaml
swagger-cli validate artifacts/openapi/collab.yaml
swagger-cli validate artifacts/openapi/runner.yaml
swagger-cli validate artifacts/openapi/deployments.yaml
swagger-cli validate artifacts/openapi/evidence.yaml

# TypeScript syntax check (expected: missing deps - OK for templates)
npx tsc --noEmit artifacts/health/*.ts artifacts/auth/*.ts

# Grafana JSON validation
jq empty artifacts/grafana/*.json

# Database schema syntax (requires PostgreSQL 16)
# psql -f artifacts/database/schema.sql  # Run if Postgres available
```

**Expected Results**:
- ✅ All OpenAPI specs valid (exit 0)
- ⚠️ TypeScript shows missing deps (`pg`, `ioredis`, `undici`, `@kubernetes/client-node`, `jose`) - **THIS IS EXPECTED** (artifacts are templates)
- ✅ All Grafana JSONs valid (exit 0)
- ✅ SQL schema applies without errors (if tested)

**If unexpected errors**: Fix them before proceeding to Step 4.

---

### 3.4 Code Quality Audit

**Check each TypeScript artifact for**:

1. **Lint Errors** (ESLint rules)
   - No unused variables? 
   - Correct import statements?
   - Consistent code style?

2. **TypeScript Errors** (beyond missing deps)
   - No type mismatches?
   - Correct async/await usage?
   - Proper error handling?

3. **Bad Coding Practices**
   - No hardcoded secrets?
   - No SQL injection vulnerabilities?
   - Timeouts on all external calls?
   - Proper resource cleanup (close connections)?

4. **OpenAPI Quality**
   - All endpoints have `operationId`?
   - All responses have schemas (no `{}` types)?
   - Security schemes applied consistently?
   - Examples provided for complex schemas?

5. **Grafana Quality**
   - Panel IDs unique?
   - Datasources configured correctly?
   - PromQL queries syntactically valid?
   - Readable titles and descriptions?

**If quality issues found**: Fix them now. Create `.automation/phase0_fixes.md` documenting what you fixed and why.

---

## Step 4: Execute Phase 0 (18 Wins)

### 4.1 Setup Working Environment

```bash
# Create new repo directory
mkdir -p ~/code/ai-coding-platform
cd ~/code/ai-coding-platform

# Copy all context files
cp -r <source>/docs/09_191025_todays_status/New_repo_microservice_discussion/* .

# Initialize git
git init
git config user.name "Codex AI"
git config user.email "codex@ai-coding-platform.dev"
```

---

### 4.2 Execute Contract Wins 1-18

Follow `00_phase0_new_repo_contract.json` exactly:

#### **Win 1: Repo Init**
```bash
git init
echo "# AI Coding Platform" > README.md
git add README.md
git commit -m "feat: initialize repository"
```

#### **Win 2: Monorepo Structure**
```bash
mkdir -p packages/{health,shared-types,logger}
mkdir -p services/{auth,bff,collab,deployments,evidence,files,frontend,projects,runner}
mkdir -p database/migrations
mkdir -p infrastructure/{docker,kubernetes,observability}
mkdir -p .github/workflows
```

#### **Win 3: Root package.json + TypeScript**
```bash
npm init -y
npm install -D typescript@5.6.3 @types/node@20 vitest eslint prettier
# Create tsconfig.json (see contract for full config)
# Create eslint.config.js
# Create .prettierrc
```

#### **Win 4: Shared Packages**
```bash
# packages/health/
cp artifacts/health/shared.ts packages/health/src/index.ts
# Add package.json with exports

# packages/shared-types/
# Create types from OpenAPI specs

# packages/logger/
# Create Winston/Pino logger
```

#### **Win 5: OpenAPI Specs**
```bash
cp artifacts/openapi/auth.yaml services/auth/openapi.yaml
cp artifacts/openapi/collab.yaml services/collab/openapi.yaml
cp artifacts/openapi/runner.yaml services/runner/openapi.yaml
cp artifacts/openapi/deployments.yaml services/deployments/openapi.yaml
cp artifacts/openapi/evidence.yaml services/evidence/openapi.yaml

# Validate
npm run validate:openapi  # Add this script to root package.json
```

#### **Win 6: Docker Compose Infrastructure**
```bash
# Create infrastructure/docker/docker-compose.yml
# Services: postgres:16-alpine, redis:7-alpine, grafana/tempo, grafana/loki, prometheus, grafana
# Volumes for persistence
# Networks for isolation
docker-compose up -d
docker-compose ps  # All healthy
```

#### **Win 7: Database Migrations**
```bash
# Install golang-migrate
# Copy artifacts/database/schema.sql to database/migrations/001_init.up.sql
# Create 001_init.down.sql
migrate -path database/migrations -database "$DATABASE_URL" up
# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

#### **Win 8: Health Check Package**
```bash
cd packages/health
cp ../../artifacts/health/*.ts src/
npm install pg ioredis undici @kubernetes/client-node
npm run typecheck  # Must pass
npm run test       # Write unit tests
```

#### **Win 9: S2S Auth Package**
```bash
mkdir -p packages/auth-s2s/src
cp artifacts/auth/s2s-client.ts packages/auth-s2s/src/client.ts
cp artifacts/auth/s2s-server.ts packages/auth-s2s/src/server.ts
npm install jose undici
npm run typecheck  # Must pass
```

#### **Win 10: Service Templates**
```bash
# For each service (auth, collab, runner, etc.):
cd services/<service>
npm init -y
# Create src/index.ts with Express server
# Add health endpoints using packages/health
# Add OTEL instrumentation
# Copy OpenAPI spec from artifacts
# Add Dockerfile
```

#### **Win 11: Observability Setup**
```bash
# Copy artifacts/grafana/*.json to infrastructure/observability/grafana/dashboards/
# Copy artifacts/infrastructure/prometheus-alerts.yaml to infrastructure/observability/prometheus/
# Import dashboards: http://localhost:3000/dashboards (Grafana UI)
# Verify panels load without errors
```

#### **Win 12: Kubernetes Manifests**
```bash
# Create infrastructure/kubernetes/
# Generate manifests for each service (Deployment + Service + Ingress)
# Follow artifacts/infrastructure/deployment-sequence.mmd for dependencies
# Add health probes to all Deployments
```

#### **Win 13: CI/CD Pipeline**
```bash
# Create .github/workflows/ci.yml
# Jobs: lint, typecheck, test, build, validate-openapi, validate-contracts
# Create .github/workflows/deploy-staging.yml
# Create .github/workflows/deploy-production.yml
```

#### **Win 14: Root Scripts**
```bash
# Add to root package.json scripts:
"dev": "docker-compose up",
"test": "vitest run",
"lint": "eslint .",
"typecheck": "tsc --noEmit",
"validate:openapi": "swagger-cli validate services/*/openapi.yaml",
"validate:all": "npm run lint && npm run typecheck && npm test && npm run validate:openapi"
```

#### **Win 15: Documentation**
```bash
# Create docs/
mkdir -p docs/{architecture,api,deployment,development}
# Copy relevant sections from Round 3 doc
cp 13_round_3.md docs/architecture/phase0-decisions.md
cp artifacts/database/README.md docs/development/migrations.md
```

#### **Win 16: Pre-commit Hooks**
```bash
npm install -D husky lint-staged
npx husky install
# Add pre-commit hook: lint-staged, typecheck, test changed files
```

#### **Win 17: Environment Config**
```bash
# Create .env.example
cp .env.example .env
# Add DATABASE_URL, REDIS_URL, OTEL_ENDPOINT, etc.
```

#### **Win 18: Final Validation**
```bash
npm run validate:all
docker-compose ps  # All services healthy
curl http://localhost:8080/healthz  # BFF responds
git status  # Everything committed
```

---

### 4.3 Run MustPass Validations

Execute all 12 validation commands from contract:

```bash
npm install            # exit 0
npm run typecheck      # exit 0
npm run lint           # exit 0
npm test               # exit 0, coverage ≥80% line, ≥75% branch
npm run validate:openapi  # exit 0
docker-compose up -d   # exit 0
docker-compose ps      # all services "healthy"
# Grafana dashboards import (manual check)
curl http://localhost:5432  # Postgres responds
psql $DATABASE_URL -c "SELECT * FROM tenants LIMIT 1"  # exit 0
git status             # clean working tree
```

**If ANY mustPass fails**: STOP, document failure, fix, re-run.

---

## Step 5: Evidence Collection

### 5.1 Generate Artifacts

```bash
# SBOM
npm run sbom           # Generate sbom.spdx.json
npm run sbom:cyclonedx # Generate sbom.cdx.json

# SLSA Provenance
npm run provenance     # Generate provenance.intoto.jsonl

# Coverage Report
npm test -- --coverage
# Output: coverage/ directory

# Contract Validation
npm run contract:check  # Validate Phase 0 contract
```

---

### 5.2 Create Phase 0 Completion Report

Create `.automation/phase0_completion_report.md`:

```markdown
# Phase 0 Completion Report

**Date**: 2025-10-19  
**Phase**: Phase 0 - Foundation Scaffold  
**Status**: ✅ COMPLETE

## Wins Delivered (18/18)

1. ✅ Repo initialized with git
2. ✅ Monorepo structure created
3. ✅ Root package.json + TypeScript configured
4. ✅ Shared packages scaffolded
5. ✅ OpenAPI specs validated
6. ✅ Docker Compose infrastructure running
7. ✅ Database migrations applied
8. ✅ Health check package working
9. ✅ S2S auth package working
10. ✅ Service templates created
11. ✅ Observability dashboards imported
12. ✅ Kubernetes manifests generated
13. ✅ CI/CD pipelines defined
14. ✅ Root scripts functional
15. ✅ Documentation complete
16. ✅ Pre-commit hooks active
17. ✅ Environment config ready
18. ✅ Final validation passed

## MustPass Validations (12/12)

- ✅ `npm install` (exit 0)
- ✅ `npm run typecheck` (exit 0)
- ✅ `npm run lint` (exit 0)
- ✅ `npm test` (exit 0, coverage: 82% line, 78% branch)
- ✅ `npm run validate:openapi` (exit 0)
- ✅ `docker-compose up -d` (exit 0)
- ✅ `docker-compose ps` (all healthy)
- ✅ Grafana dashboards imported (4/4)
- ✅ Postgres connection works
- ✅ Database schema applied (11 tables)
- ✅ Git working tree clean

## Artifacts Generated

- `sbom.spdx.json` (SPDX 2.3)
- `sbom.cdx.json` (CycloneDX 1.6)
- `provenance.intoto.jsonl` (SLSA v1.0)
- `coverage/` (Vitest coverage report)

## Issues Fixed During Execution

See `.automation/phase0_fixes.md` for detailed list.

## Next Phase

Phase 1: Auth Service Implementation (see contract Phase 1)
```

---

## Step 6: Handoff to Human

### 6.1 Final Checklist

Before reporting completion:

- [ ] All 18 wins complete
- [ ] All 12 mustPass validations pass
- [ ] All artifacts generated (SBOM, provenance, coverage)
- [ ] Phase 0 completion report created
- [ ] Git repository clean (all changes committed)
- [ ] Docker Compose stack running
- [ ] Grafana dashboards imported
- [ ] Documentation up to date

### 6.2 Deliverables

Provide human with:

1. **Repository Location**: `~/code/ai-coding-platform/`
2. **Completion Report**: `.automation/phase0_completion_report.md`
3. **Fixes Log**: `.automation/phase0_fixes.md` (if any issues fixed)
4. **Evidence Artifacts**: `sbom.spdx.json`, `sbom.cdx.json`, `provenance.intoto.jsonl`, `coverage/`
5. **Access URLs**:
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090
   - Tempo: http://localhost:3200
   - BFF: http://localhost:8080

### 6.3 Success Message

```
✅ Phase 0 Complete

Scaffolded ai-coding-platform monorepo with:
- 12 services (9 platform + 3 AI)
- 5 OpenAPI specs validated
- 4 Grafana dashboards imported
- Database foundation (11 tables)
- Docker Compose stack running
- All validations passing (18 wins, 12 mustPass)

Next: Phase 1 - Auth Service Implementation

Time: ~16h AI execution
```

---

## Emergency Protocols

### If Validation Fails

1. **STOP immediately** - do not proceed to next win
2. **Document failure** in `.automation/phase0_trace.jsonl`
3. **Diagnose root cause** (read logs, check errors)
4. **Fix issue** (follow artifacts, not assumptions)
5. **Re-run validation** (must pass before continuing)
6. **Log fix** in `.automation/phase0_fixes.md`

### If Artifact Conflicts Found

1. **Trust order**: `13_round_3.md` > artifacts > earlier rounds
2. **Document conflict** in `.automation/phase0_conflicts.md`
3. **Propose fix** based on Big Tech standards (RFCs, best practices)
4. **Wait for human approval** (do NOT auto-fix ambiguous conflicts)

### If Stack Violation Detected

1. **HALT execution** (do not add forbidden tech)
2. **Report violation** to human
3. **Suggest compliant alternative** (e.g., use TypeScript instead of Python)
4. **Wait for approval** before proceeding

---

## Quality Bars (Non-Negotiable)

- **TypeScript/JavaScript ONLY** - no Python, no Go, no Rust
- **OpenAPI 3.1.0** - all specs must validate
- **RFC Compliance** - OAuth 2.1, RFC 9457, RFC 9068
- **Test Coverage** - ≥80% line, ≥75% branch
- **Zero Warnings** - ESLint, TypeScript, YAML lint
- **Zero Assumptions** - discovery-first, never guess
- **Perfect or Never** - ship quality code or don't ship

---

## Final Notes

- **Execution time**: ~16-24 hours (AI time, not human time)
- **Complexity**: HIGH (18 wins, 12 services, full observability stack)
- **Risk**: LOW (artifacts are 100% complete, validated by Big Tech standards)
- **Success metric**: All 12 mustPass validations pass on first try

**Good luck, Codex. Execute with precision.**

---

**End of Instructions**
