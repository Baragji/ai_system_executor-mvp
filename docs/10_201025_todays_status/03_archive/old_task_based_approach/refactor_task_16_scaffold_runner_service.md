# Refactor Task 16: Scaffold Runner Service (Express + OTel + RFC 9457)

**Task ID**: REFACTOR-TASK-16
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-11..15
**Service**: runner
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION

```bash
ls -la services/runner || true
rg -n "PORT=" services/runner/.env.example || true
```

## Context
Create a new `services/runner` service scaffold mirroring the template’s structure: Express app, /healthz route, OTel bootstrap, problem+json middleware, and per-service validate:all scripts.

## Implementation Steps

1) Scaffold from template
```bash
mkdir -p services/runner
cp -R services/_template/* services/runner/
sed -i '' 's/@executor\/service-template/@executor\/runner-service/g' services/runner/package.json
sed -i '' 's/PORT=3999/PORT=3004/g' services/runner/.env.example
```

2) Rename service metadata
- Update README and SERVICE_NAME in telemetry if present to `executor-runner-service`.

## POST-EXECUTION VALIDATION

```bash
cd services/runner && npm run validate:all
curl -sfS http://localhost:3004/healthz || true
```

## Rollback Procedure

```bash
git checkout -- services/runner
```

## Definition of Done
- [ ] Runner service scaffolded from template
- [ ] validate:all passes in `services/runner`
- [ ] /healthz returns {"status":"ok"}
