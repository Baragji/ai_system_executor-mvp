# Refactor Task 29: Scaffold Clarification Service + Extract /clarify

**Task ID**: REFACTOR-TASK-29
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-21
**Service**: clarification
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION

```bash
rg -n "\/(api\/)?clarify|generateQuestions\(|augmentPrompt\(|suggestDefaults\(" src tests | head -n 20
```

## Context
Create `services/clarification` service and move the clarification logic behind POST /clarify. Preserve request/response shape used by monolith route and tests.

## Implementation Steps

1) Scaffold from template
```bash
mkdir -p services/clarification
cp -R services/_template/* services/clarification/
sed -i '' 's/@executor\/service-template/@executor\/clarification-service/g' services/clarification/package.json
sed -i '' 's/PORT=3999/PORT=3007/g' services/clarification/.env.example
```

2) Add route and handler
- `services/clarification/src/routes/clarify.ts` → uses `generateQuestions`/`augmentPrompt` as needed

3) Wire in server
- Mount `/clarify` in `services/clarification/src/server.ts`

## POST-EXECUTION VALIDATION

```bash
cd services/clarification && npm run validate:all
```

## Rollback Procedure

```bash
git checkout -- services/clarification
```

## Definition of Done
- [ ] Clarification service scaffolded and /clarify implemented
- [ ] validate:all passes for clarification service
- [ ] Request/response parity maintained

