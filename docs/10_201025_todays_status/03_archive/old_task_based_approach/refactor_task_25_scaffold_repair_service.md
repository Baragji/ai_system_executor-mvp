# Refactor Task 25: Scaffold Repair Service (Express + OTel + RFC 9457)

**Task ID**: REFACTOR-TASK-25
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-21
**Service**: repair
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
ls -la services/repair || true
```

## Context
Create `services/repair` scaffold mirroring the template: Express app, /healthz route, OTel bootstrap, problem+json, validate:all scripts.

## Implementation Steps

1) Scaffold from template
```bash
mkdir -p services/repair
cp -R services/_template/* services/repair/
sed -i '' 's/@executor\/service-template/@executor\/repair-service/g' services/repair/package.json
sed -i '' 's/PORT=3999/PORT=3003/g' services/repair/.env.example
```

2) Rename service metadata
- Update README and SERVICE_NAME to `executor-repair-service`.

## POST-EXECUTION VALIDATION

```bash
cd services/repair && npm run validate:all
curl -sfS http://localhost:3003/healthz || true
```

## Rollback Procedure

```bash
git checkout -- services/repair
```

## Definition of Done
- [ ] Repair service scaffolded from template
- [ ] validate:all passes in `services/repair`
- [ ] /healthz returns {"status":"ok"}

