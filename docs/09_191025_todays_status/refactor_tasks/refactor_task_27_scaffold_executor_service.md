# Refactor Task 27: Scaffold Executor Service (Express + OTel + RFC 9457)

**Task ID**: REFACTOR-TASK-27
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-21
**Service**: executor
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
ls -la services/executor || true
```

## Context
Create `services/executor` scaffold mirroring the template: Express app, /healthz route, OTel bootstrap, problem+json, validate:all scripts.

## Implementation Steps

1) Scaffold from template
```bash
mkdir -p services/executor
cp -R services/_template/* services/executor/
sed -i '' 's/@executor\/service-template/@executor\/executor-service/g' services/executor/package.json
sed -i '' 's/PORT=3999/PORT=3001/g' services/executor/.env.example
```

2) Rename service metadata
- Update README and SERVICE_NAME to `executor-executor-service`.

## POST-EXECUTION VALIDATION

```bash
cd services/executor && npm run validate:all
curl -sfS http://localhost:3001/healthz || true
```

## Rollback Procedure

```bash
git checkout -- services/executor
```

## Definition of Done
- [ ] Executor service scaffolded from template
- [ ] validate:all passes in `services/executor`
- [ ] /healthz returns {"status":"ok"}

