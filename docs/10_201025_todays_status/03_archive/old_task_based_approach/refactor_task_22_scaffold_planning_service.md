# Refactor Task 22: Scaffold Planning Service (Express + OTel + RFC 9457)

**Task ID**: REFACTOR-TASK-22
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-21, Refactor Tasks 01–03
**Service**: planning
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
ls -la services/planning || true
rg -n "PORT=" services/planning/.env.example || true
```

## Context
Create a new `services/planning` service scaffold mirroring the template’s structure: Express app, /healthz route, OTel bootstrap, problem+json middleware, and per-service validate:all scripts.

## Implementation Steps

1) Scaffold from template
```bash
mkdir -p services/planning
cp -R services/_template/* services/planning/
sed -i '' 's/@executor\/service-template/@executor\/planning-service/g' services/planning/package.json
sed -i '' 's/PORT=3999/PORT=3002/g' services/planning/.env.example
```

2) Rename service metadata
- Update README and SERVICE_NAME in telemetry if present to `executor-planning-service`.

## POST-EXECUTION VALIDATION

```bash
cd services/planning && npm run validate:all
curl -sfS http://localhost:3002/healthz || true
```

## Rollback Procedure

```bash
git checkout -- services/planning
```

## Definition of Done
- [ ] Planning service scaffolded from template
- [ ] validate:all passes in `services/planning`
- [ ] /healthz returns {"status":"ok"}

