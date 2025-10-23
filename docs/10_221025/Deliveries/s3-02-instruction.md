# P21 — S3-02 Execution Instruction (Files/Health/Executions Extraction)

Last updated: 2025-10-23

This instruction guides extracting remaining inline handlers from `src/server.ts` into DI-based routers while preserving behavior 1:1 and keeping all quality gates green.

## Scope

Routes to extract from `src/server.ts`:
- GET `/healthz`
- GET `/api/executions/:id`
- GET `/output-archive/:project/:tail(*)?` (zip/tar stream)
- GET `/output/:project/*?` (HTML directory index)
- GET `/api/files/:project/:path(*)` (file content)

Anchors (re-validate just before edits):
- Healthz: ~line 394
- Executions status: ~lines 397–406
- Output archive: ~lines 408–520
- Output listing: ~lines 507–660
- File content: ~lines 1777–1810

See `.automation/phase21_discovery_note.md` for code snippets and more details.

## Contracts and Dependencies

- No API changes: paths, methods, and payloads remain identical.
- Feature flags untouched (AGENTS_RUNTIME, PROBLEM_DETAILS_ENABLED, OTEL_ENABLED).
- No new dependencies.
- Error handling: preserve existing behavior (problem details for `/api/executions/:id` 404; plain JSON `{ error }` elsewhere).

### DI Surfaces

Define two DI surfaces and routers.

1) Status domain (health + executions)
- File: `src/domains/status/routes.ts`
- Type:
  ```ts
  import type { Application } from "express";
  import type { ExecutionRecord } from "../../orchestrator/executionsStore.js";

  export type StatusDeps = {
    getExecution: (id: string) => ExecutionRecord | null;
  };

  export function mountStatusRoutes(app: Application, deps: StatusDeps): void {
    app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

    app.get("/api/executions/:id", (req, res) => {
      const { id } = req.params as { id: string };
      const record = deps.getExecution(id);
      if (!record) {
        return respondWithProblem(res, 404, "NotFound", "execution not found", req.originalUrl || req.url || "/api/executions");
      }
      return res.json(record);
    });
  }
  ```
  - Import `respondWithProblem` from `src/middleware/problemDetails.ts` (types-only import not needed);
  - Only dependency is `getExecution`.

2) Files domain (archive + listing + file content)
- File: `src/domains/files/routes.ts`
- Type:
  ```ts
  import type { Application, Request, Response } from "express";
  import fs from "node:fs/promises";
  import path from "node:path";
  import { spawn } from "node:child_process";
  import { ZipFile } from "yazl";

  export type FilesDeps = {
    slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
    outputDir: string;
  };

  function toPosixPath(value: string): string { return value.replace(/\\/g, "/"); }
  async function addDirectoryToZip(zip: ZipFile, absoluteDir: string, relativeDir: string): Promise<void> { /* copy exact logic from server.ts */ }

  export function mountFilesRoutes(app: Application, deps: FilesDeps): void {
    const { slugify, outputDir } = deps;

    app.get("/output-archive/:project/:tail(*)?", async (req: Request, res: Response) => { /* copy exact logic */ });

    app.get("/output/:project/*?", async (req: Request, res: Response, next) => { /* copy exact logic */ });

    app.get("/api/files/:project/:path(*)", async (req: Request, res: Response) => { /* copy exact logic */ });
  }
  ```
  - Use node core modules directly and preserve headers/streaming behavior.
  - Keep path traversal checks exactly as-is (`startsWith(projectRoot)`).

## Wiring (Mounts)

In `src/server.ts`, import and mount these routers below existing domain mounts and above static middleware:

```ts
import { mountStatusRoutes } from "./domains/status/routes.js";
import { mountFilesRoutes } from "./domains/files/routes.js";

mountStatusRoutes(app, { getExecution });
mountFilesRoutes(app, { slugify, outputDir: OUTPUT_DIR });
```

Remove the now-duplicated inline handlers for the five endpoints.

## Tests

Create two suites with 100% coverage for new routers.

- `tests/domains/status/routes.test.ts`
  - GET /healthz → 200 { status: "ok" }
  - GET /api/executions/:id → 200 (record present) and 404 with problem details (not found)
  - Stub deps.getExecution and assert call args; verify problem details fields match existing helper output (type, title, detail, instance).

- `tests/domains/files/routes.test.ts`
  - GET /output-archive/:project →
    - 403 on path escape
    - 404 on missing path
    - 400 if not a directory
    - Happy-path zip: assert headers and that `ZipFile` output stream is piped (can stub fs/stat + addDirectoryToZip minimal path)
    - Happy-path tar: assert headers and spawn called with expected args; simulate stderr and non-zero exit to exercise error branches
  - GET /output/:project/* →
    - Next() for missing or non-directory
    - 403 on escape
    - Happy path returns HTML with archive links and rows; snapshot key fragments (not brittle full doc)
  - GET /api/files/:project/:path(*) →
    - 403 on escape
    - 404 on missing or non-file
    - Text file → { content: string, size, modified, binary: false }
    - Binary file → { content: null, size, modified, binary: true }

Notes:
- Use stubs/mocks only in tests; production code must not import test helpers.
- Ensure branches for error handling are covered (spawn error, tar close non-zero, zip stream error, fs.stat/read errors).

## Validation Protocol (gates)

Run and require PASS:
- Lint: `npm run -s lint` (no warnings)
- Typecheck: `npm run -s typecheck`
- Tests: `npm -s test` (coverage: 100% for new routers; repo thresholds green)
- Contract validation: `npm run -s contract:check`
- Build: `npm run -s build`
- SBOM SPDX: `npm run -s sbom`
- SBOM CycloneDX: `npm run -s sbom:cyclonedx`
- Provenance: `npm run -s provenance`

Set `NODE_ENV=test` for tests; queue remains forced inline mode per existing server behavior.

## Completion Criteria

- Inline handlers fully removed from `src/server.ts`.
- Routers call only injected deps (no direct access to server-scoped constants except via DI for `outputDir`).
- Behavior parity verified by tests (status codes, payload shapes, headers, streams, HTML structure where relevant).
- All quality gates green; no warnings in CI logs.
- Discovery note updated with final state and commit message:
  - `✅ [P21-S3-02] extraction complete – DI verified, tests green.`

## Anchor Reminder

Re-validate line numbers in `src/server.ts` immediately before editing to account for prior extractions shifting code.
