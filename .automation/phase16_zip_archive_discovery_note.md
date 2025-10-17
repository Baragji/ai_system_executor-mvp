# Phase 16 — Output Archive Zip Discovery

- Goal: Provide cross-platform project downloads by adding a ZIP archive option and ensure telemetry tests remain green.
- Scope touches server download route, success card buttons, and API tests.

## Integration Points
- `src/server.ts:371-420` — `/output-archive/:project/*?` route currently shells out to `tar` and streams `.tar.gz`.
- `public/script.js:906-916` — success card actions append a single "Download .tar.gz" link.
- `src/server.ts:428-540` — HTML directory index for `/output/:project` (place to surface new download link).
- `tests/api/files.test.ts` — API coverage for file routes; no archive coverage yet.

## Observations
- Server route fails when `tar` is unavailable (`ENOENT`); CI screenshot shows this on Windows runners.
- UI only advertises `.tar.gz`, confusing for Windows users.
- Directory index lacks quick download affordance.
- Clarification telemetry test sporadically saw HTTP 500 when the workflow aborted before producing a payload; reproduced by letting plan succeed with `stop=true` but no response guard — ensure coverage after archive change.

## Plan
1. Introduce ZIP streaming using a lightweight dependency (`yazl`) with optional `format=zip` (default) while keeping `format=tar` fallback.
2. Update success card to show both `.zip` (default) and `.tar.gz` actions.
3. Expose download links in `/output` directory index (zip + tar) with safe path handling.
4. Add API test verifying the ZIP response and guard regression of clarification telemetry test.

## Stack Compliance
- Backend change remains in Node/Express; frontend stays vanilla JS.
- New dependency: `yazl` (MIT) for creating ZIP archives; TypeScript types via `@types/yazl`.
- No protected files modified.
