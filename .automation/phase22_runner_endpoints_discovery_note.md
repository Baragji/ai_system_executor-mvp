# Phase 22 Discovery Note — REFACTOR-TASK-17: Runner Endpoints Extraction

Date: 2025-10-19

Scope: Expose sandbox runner capabilities via `services/runner` HTTP endpoints (`POST /run`, `/install`, `/test`) that mirror existing monolith behavior.

## Integration Points

- **src/server.ts (lines 1946-1981)** — Current `POST /api/run-tests` route slugifies `project`, resolves `output/<slug>`, ensures project exists, then calls `runInSandbox` and returns the raw `RunResult` JSON. Errors respond with `{ error: string }` and 4xx/5xx codes.
- **src/runner/runInSandbox.ts (lines 87-183)** — `runInSandbox(options)` installs dependencies, streams logs, and returns validated `RunResult`. Accepts `{ projectRoot, projectSlug, command?, timeoutMs?, env?, sessionId? }`.
- **src/runner/installDeps.ts (lines 24-118)** — `ensureDependencies(projectRoot, timeoutMs?)` inspects package.json/node_modules, validates deps, runs `npm ci`/`npm install`, and returns `{ installed, command, stdout?, stderr? }` or throws on failure/timeout.
- **src/runner/runUIValidation.ts (lines 210-280)** — `runUIValidation(projectRoot, options?)` runs Playwright + Lighthouse checks, producing a `UIValidationResult` with status + notes. Candidate for `/test` expansion once UI validation moves out of monolith.

## Code Snippets (±10 lines)

- `src/server.ts`:
```ts
app.post("/api/run-tests", async (req, res) => {
  try {
    const project: string = (req.body?.project || "").toString();
    if (!project) {
      return res.status(400).json({ error: "project required" });
    }
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try {
      await fs.access(projectRoot);
    } catch {
      return res.status(404).json({ error: "project not found" });
    }

    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
    return res.json(run);
  } catch (err: unknown) {
```

- `src/runner/runInSandbox.ts`:
```ts
export interface RunInSandboxOptions {
  projectRoot: string;
  projectSlug: string;
  command?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  sessionId?: string;
}

export async function runInSandbox(options: RunInSandboxOptions): Promise<RunResult> {
  const { projectRoot, projectSlug, command: providedCommand, timeoutMs = DEFAULT_TIMEOUT_MS, sessionId } = options;
  // Check if execution was paused before running tests
  throwIfAborted(sessionId, "testing");
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...options.env,
    FORCE_COLOR: "0",
    CI: "1"
  };
```

- `src/runner/installDeps.ts`:
```ts
export async function ensureDependencies(
  projectRoot: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<EnsureDependenciesResult> {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const nodeModulesPath = path.join(projectRoot, "node_modules");

  const hasPackageJson = await pathExists(packageJsonPath);
  if (!hasPackageJson) {
    return { installed: false, command: null };
  }

  const hasNodeModules = await pathExists(nodeModulesPath);
  // Determine if declared deps are missing from node_modules
```

## Dependencies & Potential Impacts

- Service must import domain modules from monolith (`src/runner/*`). Keep relative ESM `.js` paths consistent with existing imports.
- Requires `slugify` to match monolith slug normalization when handling `{ project }` payloads.
- Errors should continue returning `{ error: string }` for parity until clients migrate to RFC 9457 bodies.
- Long-running installs/tests must honor existing timeout semantics to avoid hanging HTTP workers.

## Compliance Check (ai-stack.json)

- Language: TypeScript ✅
- Framework: Express ✅
- Testing: Vitest + Supertest ✅
- Telemetry: OTEL optional ✅
- Forbidden tech: none introduced ✅

## Justification

- Exposing runner endpoints allows monolith + future orchestrator to offload sandbox/test execution via HTTP while retaining validated domain logic.
- Matching response shapes ensures existing UI/tests continue to pass when RUNNER_URL proxies are enabled in Task 18.
- Dedicated routes improve observability and isolation, aligning with Phase 22 service extraction contract.
