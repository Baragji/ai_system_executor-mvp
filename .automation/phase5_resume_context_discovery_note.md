# Phase 5 Resume Context — Discovery

Date: 2025-10-11
Scope: Phase 2 of MCP tooling roadmap — resume endpoint should relaunch execution with manifest-driven context and MCP tools.

## Integration Points & Current State

- **Resume endpoint** — `src/server.ts`
  ```ts
  app.post("/api/sessions/:id/resume", async (req, res) => {
    …
    const result = await resumeFromCheckpoint(sessionId, answers, {
      machine: session.machine,
      reason: reasonRaw || undefined
    });

    session.paused = false;
    session.questions = [];
    …
    return res.json({ checkpoint: result.checkpoint, answeredQuestions: result.answeredQuestions });
  });
  ```
  *Only flips orchestrator state; does not kick off another execution or supply manifest/answer context to the LLM.*

- **Single-run executor flow** — `src/server.ts`
  ```ts
    let output: ExecutorOutput;
    try {
      setProgress(sessionId, "planning", 30);
      output = await withTraceContext({ projectSlug: slugify(...), sessionId, phase: 'single' }, async () =>
        generateExecutorOutputFromPrompt(systemPrompt, effectivePrompt, { enforceTests: true, sessionId })
      );
    } catch (error) {
      setProgress(sessionId, "finalizing", 100, { error: (error as Error).message }, true);
      return res.status(422).json({ error: (error as Error).message });
    }
  ```
  *Hard-coded to clean the workspace before generation and tightly coupled to the HTTP handler; needs refactor to reuse during resume without wiping files.*

- **Workspace manifest helpers** — `src/orchestrator/workspaceManifest.ts`
  ```ts
  export async function getManifest(sessionId: string): Promise<WorkspaceManifest | null> {
    const filename = `${sanitizeSessionId(sessionId)}.json`;
    try {
      const raw = await fs.readFile(path.join(MANIFESTS_DIR, filename), "utf-8");
      return JSON.parse(raw) as WorkspaceManifest;
    } catch (error) {
      if (isErrnoLike(error) && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  ```
  *Provides raw manifest data but no formatting utilities for prompt ingestion.*

- **Workspace summary utilities** — `src/workspace/manifest.ts`
  ```ts
  export function summarizeWorkspace(files: WorkspaceFileEntry[], topN = 20): WorkspaceSummary {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const topFiles = [...files].sort((a, b) => b.size - a.size).slice(0, topN);
    return {
      totalFiles: files.length,
      totalSize,
      topFiles,
      tree: buildWorkspaceTree(files)
    };
  }
  ```
  *Summaries exist but there is no textual formatter for LLM consumption.*

- **Resume orchestration** — `src/orchestrator/resume.ts`
  ```ts
  export async function resumeFromCheckpoint(
    sessionId: string,
    answers: ResumeAnswer[],
    options: ResumeOptions = {}
  ): Promise<ResumeResult> {
    const checkpoint = await loadCheckpoint(sessionId);
    …
    const answeredQuestions: ResolvedQuestion[] = resolved.map(item => ({
      id: item.question.id,
      question: item.question.question,
      type: item.question.type,
      answer: item.answer.value,
      ...(item.question.metadata ? { metadata: item.question.metadata } : {})
    }));
    …
  }
  ```
  *Returns answered question metadata that we can surface in resume prompts; currently unused by HTTP layer.*

## Planned Additions

1. **Reusable single-run helper**: extract single-execution logic into a function that can preserve existing workspaces when resuming and still performs testing/repair.
2. **Resume prompt builder**: new module to compose system/user prompts that embed checkpoint metadata, answered questions, and manifest summaries while instructing the LLM to leverage MCP tools.
3. **Manifest formatter**: helper to convert `WorkspaceSummary` into concise human-readable text for prompts.
4. **Resume launch orchestration**: update `/api/sessions/:id/resume` to load manifest, build prompts, create a fresh abort signal, and asynchronously call the reusable execution helper.
5. **Fixtures & telemetry**: capture resume context (adjustment, answers, manifest hash) for traceability, keeping AGENTS.md evidence requirements satisfied.

## Dependencies & Compliance

- **New dependency**: install `@rollup/rollup-linux-x64-gnu` explicitly so Vitest coverage runs without missing optional binary (approved by codeowner).
- **Stack check**: remains Node 20 + TypeScript; new modules stay within backend scope.
- **Security**: resume prompt builder will rely on existing manifest sanitization; ensure no raw path leakage beyond `output/<slug>`.

## Risks & Mitigations

- **Workspace churn**: skipping directory cleanup may leave stale files; mitigate by instructing LLM to review manifest and explicitly overwrite changed files.
- **Prompt bloat**: manifest summaries can become large; limit to top-N files and tree preview.
- **Async resume errors**: wrap asynchronous execution launch with logging and progress updates so failures surface in progress stream.

