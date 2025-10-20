# Refactor Task 12: Scaffold Orchestrator Service (Express + OTel + RFC 9457)

**Task ID**: REFACTOR-TASK-12
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-11, Refactor Tasks 01–03
**Service**: orchestrator
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
ls -la services/orchestrator || true
rg -n "PORT=" services/orchestrator/.env.example || true
```

## Context
Create a new `services/orchestrator` service scaffold mirroring the template’s structure: Express app, /healthz route, OTel bootstrap, problem+json middleware, and per-service validate:all scripts.

## Implementation Steps

1) Scaffold from template
```bash
mkdir -p services/orchestrator
cp -R services/_template/* services/orchestrator/
sed -i '' 's/@executor\/service-template/@executor\/orchestrator-service/g' services/orchestrator/package.json
sed -i '' 's/PORT=3999/PORT=3005/g' services/orchestrator/.env.example
```

2) Rename service metadata
- Update README and SERVICE_NAME in telemetry if present to `executor-orchestrator-service`.

## POST-EXECUTION VALIDATION

```bash
cd services/orchestrator && npm run validate:all
curl -sfS http://localhost:3005/healthz || true
```

## Rollback Procedure

```bash
git checkout -- services/orchestrator
```

## Definition of Done
- [ ] Orchestrator service scaffolded from template
- [ ] validate:all passes in `services/orchestrator`
- [ ] /healthz returns {"status":"ok"}
