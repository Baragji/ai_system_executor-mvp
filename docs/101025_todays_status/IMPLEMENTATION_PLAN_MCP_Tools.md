# Implementation Plan: LLM Context Continuity for Pause/Resume

**Date**: 2025-10-11 04:00 AM  
**Based On**: Research findings from AI assistant  
**Strategy**: Incremental implementation (Phase 1 → 2 → 3)

---

## Executive Summary from Research

> **Recommendation:** "Durable, step-checkpointed jobs on BullMQ + an MCP-style filesystem tool for the LLM"

**Key Insights**:
1. **Cursor** uses file-tree hashes and diffs (Merkle-tree) - LLM reads relevant files on resume
2. **Replit Agent** exposes filesystem operations (fs API) - agent reads/edits files directly
3. **Industry standard (MCP)**: read_file/list_dir tools so agents load context from disk on demand
4. **They DON'T rely on chat history** - they recompute context from file/repo state

---

## Our Phased Approach

### Why NOT Full BullMQ Migration Immediately?

**AGENTS.md constraint**: "❌ No new dependencies without explicit justification"

**BullMQ requires**:
- BullMQ package
- ioredis (Redis client)  
- Redis server infrastructure

**We can solve the CORE problem without BullMQ first**:
- ✅ MCP-style tools (NO dependencies - built-in fs)
- ✅ Workspace manifest (NO dependencies - built-in crypto)
- ✅ Resume with context (NO dependencies - existing patterns)

**BullMQ benefits are FUTURE concerns**:
- Distributed workers (don't need yet - single process fine)
- Durability across restarts (nice but not MVP-critical)
- Queue management (already have AbortSignal)

**Our execution ALREADY has small steps**:
- decomposeTask: ~30-60s ✅
- generateSubtaskOutput: ~30-60s per subtask ✅
- runInSandbox: ~10-30s ✅

Research says: "≤30-60s steps" → We already have this!

---

## Phase 1: MCP-Style Filesystem Tools ⭐ START HERE

**Goal**: Give LLM ability to read generated output  
**Time**: 3-4 hours  
**Risk**: Low (additive, doesn't break existing)  
**Dependencies**: NONE (Node.js built-ins)

### What to Build

#### 1. Filesystem Tools (`src/llm/tools/fsTools.ts`)

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const OUTPUT_ROOT = path.resolve(process.cwd(), "output");

// Security: Ensure path is within output directory
function validatePath(projectPath: string): string {
  const full = path.resolve(OUTPUT_ROOT, projectPath);
  if (!full.startsWith(OUTPUT_ROOT)) {
    throw new Error("Path outside output directory");
  }
  return full;
}

export const fsTools = {
  list_directory: {
    name: "list_directory",
    description: "List contents of a directory in the project workspace",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" }
      },
      required: ["path"]
    },
    execute: async ({ path: dirPath }: { path: string }, context: { projectSlug: string }) => {
      const full = validatePath(path.join(context.projectSlug, dirPath));
      const entries = await fs.readdir(full, { withFileTypes: true });
      return {
        path: dirPath,
        entries: entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? "directory" : "file"
        }))
      };
    }
  },

  read_file: {
    name: "read_file",
    description: "Read contents of a file in the project workspace",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        maxBytes: { type: "number", description: "Max bytes to read (default 200KB)" }
      },
      required: ["path"]
    },
    execute: async ({ path: filePath, maxBytes = 200_000 }: any, context: { projectSlug: string }) => {
      const full = validatePath(path.join(context.projectSlug, filePath));
      const stats = await fs.stat(full);
      const content = await fs.readFile(full, "utf8");
      const truncated = content.slice(0, maxBytes);
      
      return {
        path: filePath,
        size: stats.size,
        content: truncated,
        truncated: content.length > maxBytes,
        hash: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16)
      };
    }
  },

  get_workspace_summary: {
    name: "get_workspace_summary",
    description: "Get summary of all files in the workspace",
    parameters: {
      type: "object",
      properties: {}
    },
    execute: async (_params: any, context: { projectSlug: string }) => {
      const projectRoot = validatePath(context.projectSlug);
      const manifest = await buildWorkspaceManifest(projectRoot);
      return manifest;
    }
  }
};

async function buildWorkspaceManifest(root: string): Promise<any> {
  const files: any[] = [];
  
  async function scan(dir: string, rel: string = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = path.join(rel, entry.name);
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath, relPath);
      } else {
        const stats = await fs.stat(fullPath);
        const content = await fs.readFile(fullPath);
        files.push({
          path: relPath,
          size: stats.size,
          hash: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16),
          modified: stats.mtime.toISOString()
        });
      }
    }
  }
  
  await scan(root);
  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    files: files.sort((a, b) => b.size - a.size).slice(0, 20), // Top 20 by size
    tree: buildTree(files)
  };
}

function buildTree(files: any[]): any {
  const tree: any = {};
  for (const file of files) {
    const parts = file.path.split(path.sep);
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = { size: file.size, hash: file.hash };
  }
  return tree;
}
```

#### 2. Integrate Tools into LLM Calls (`src/llm/index.ts`)

```typescript
// Add to generateJSON function signature
export async function generateJSON(
  messages: LLMMessage[], 
  options?: { 
    sessionId?: string;
    tools?: any[]; // MCP-style tools
    toolContext?: any; // Context for tool execution (projectSlug, etc.)
  }
): Promise<string> {
  // ... existing code ...
  
  // If tools provided, add to API call
  if (options?.tools && options.tools.length > 0) {
    const toolSchemas = options.tools.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    
    // Call LLM with tools
    const response = await provider.generate(messages, { 
      tools: toolSchemas,
      signal 
    });
    
    // Handle tool calls
    if (response.tool_calls) {
      const toolResults = await Promise.all(
        response.tool_calls.map(async (call: any) => {
          const tool = options.tools!.find(t => t.name === call.function.name);
          if (!tool) throw new Error(`Unknown tool: ${call.function.name}`);
          
          const args = JSON.parse(call.function.arguments);
          const result = await tool.execute(args, options.toolContext);
          
          return {
            tool_call_id: call.id,
            role: "tool",
            content: JSON.stringify(result)
          };
        })
      );
      
      // Continue conversation with tool results
      const followup = await provider.generate([
        ...messages,
        response,
        ...toolResults
      ], { signal });
      
      return followup.content;
    }
    
    return response.content;
  }
  
  // ... existing code ...
}
```

#### 3. Track Workspace Manifest (`src/orchestrator/workspaceManifest.ts`)

```typescript
import fs from "node:fs/promises";
import path from "node:path";

interface WorkspaceManifest {
  sessionId: string;
  projectSlug: string;
  capturedAt: string;
  files: Array<{
    path: string;
    size: number;
    hash: string;
    modified: string;
  }>;
  summary: {
    totalFiles: number;
    totalSize: number;
  };
}

const MANIFESTS_DIR = path.resolve(process.cwd(), ".automation/manifests");

export async function captureManifest(
  sessionId: string, 
  projectSlug: string
): Promise<WorkspaceManifest> {
  const outputDir = path.resolve(process.cwd(), "output", projectSlug);
  
  // Scan directory and build manifest
  const files = await scanDirectory(outputDir);
  
  const manifest: WorkspaceManifest = {
    sessionId,
    projectSlug,
    capturedAt: new Date().toISOString(),
    files,
    summary: {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    }
  };
  
  // Save to disk
  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(MANIFESTS_DIR, `${sessionId}.json`),
    JSON.stringify(manifest, null, 2)
  );
  
  return manifest;
}

export async function getManifest(sessionId: string): Promise<WorkspaceManifest | null> {
  try {
    const content = await fs.readFile(
      path.join(MANIFESTS_DIR, `${sessionId}.json`),
      "utf8"
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function scanDirectory(dir: string): Promise<any[]> {
  // ... (same as buildWorkspaceManifest scan logic) ...
}
```

### Integration Points

1. **After pause** (`src/server.ts` in pause endpoint):
```typescript
app.post("/api/sessions/:id/pause", async (req, res) => {
  // ... existing pause logic ...
  
  // Capture workspace manifest at pause
  const session = getOrchestrationSession(sessionId);
  if (session?.projectSlug) {
    await captureManifest(sessionId, session.projectSlug);
  }
  
  // ... rest of handler ...
});
```

2. **During execution** (enable tools for LLM):
```typescript
// In server.ts generateExecutorOutputFromPrompt
import { fsTools } from "./llm/tools/fsTools.js";

const raw = await generateJSON(messages, {
  sessionId,
  tools: [fsTools.read_file, fsTools.list_directory, fsTools.get_workspace_summary],
  toolContext: { projectSlug }
});
```

### Testing

```typescript
// tests/llm/tools/fsTools.test.ts
describe("Filesystem Tools", () => {
  it("list_directory returns entries", async () => {
    const result = await fsTools.list_directory.execute(
      { path: "." },
      { projectSlug: "test-project" }
    );
    expect(result.entries).toBeDefined();
  });
  
  it("read_file returns content", async () => {
    const result = await fsTools.read_file.execute(
      { path: "package.json" },
      { projectSlug: "test-project" }
    );
    expect(result.content).toContain("name");
  });
  
  it("validates paths are within output", async () => {
    await expect(
      fsTools.read_file.execute(
        { path: "../../etc/passwd" },
        { projectSlug: "test-project" }
      )
    ).rejects.toThrow("Path outside output directory");
  });
});
```

---

## Phase 2: Resume with Context ⭐ NEXT

**Goal**: Make resume trigger new execution with LLM context  
**Time**: 2-3 hours  
**Risk**: Medium (changes resume semantics)  
**Dependencies**: Phase 1 complete

### What to Change

#### 1. Resume Endpoint (`src/server.ts`)

```typescript
app.post("/api/sessions/:id/resume", async (req, res) => {
  const { id } = req.params;
  const sessionId = id.trim();
  
  const session = getOrchestrationSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "session not found" });
  }
  if (!session.paused) {
    return res.status(409).json({ error: "session is not paused" });
  }
  
  const userAdjustment = req.body?.adjustment || "";
  const answers = normalizeResumeAnswers(req.body?.answers);
  
  // Load checkpoint and manifest
  const checkpoint = await loadCheckpoint(sessionId);
  const manifest = await getManifest(sessionId);
  
  // Trigger NEW execution with context
  const resumePayload = {
    prompt: checkpoint.originalPrompt + "\n\nADJUSTMENT: " + userAdjustment,
    sessionId,
    resumeContext: {
      checkpoint,
      manifest,
      answers
    }
  };
  
  // Trigger async execution (don't wait)
  executeWithContext(resumePayload).catch(err => {
    console.error("Resume execution failed:", err);
  });
  
  // Update session state
  session.paused = false;
  session.questions = [];
  
  return res.json({
    resumed: true,
    sessionId,
    message: "Execution resumed with context"
  });
});

async function executeWithContext(payload: any) {
  // This calls the same /api/execute logic but with resume context
  // LLM gets: original prompt + adjustment + manifest + checkpoint state
  // ... (reuse existing execute logic with enhanced context)
}
```

#### 2. Enhanced LLM Context (`src/server.ts` in execute)

```typescript
// When generating with resume context:
if (payload.resumeContext) {
  const { checkpoint, manifest, answers } = payload.resumeContext;
  
  // Build context-aware system prompt
  const contextPrompt = {
    role: "system",
    content: `
You are resuming a paused project generation.

CHECKPOINT STATE:
- Phase: ${checkpoint.machine.state}
- Completed subtasks: ${checkpoint.completedSubtasks || []}
- Project: ${checkpoint.projectSlug}

WORKSPACE SUMMARY:
${manifest ? formatManifestSummary(manifest) : "No files generated yet"}

USER ADJUSTMENT:
${payload.resumeContext.adjustment || "Continue as planned"}

TOOLS AVAILABLE:
- read_file: Read any generated file
- list_directory: List files in any directory
- get_workspace_summary: Get full workspace overview

INSTRUCTIONS:
1. Use tools to understand what's already been generated
2. Continue from where you left off
3. Respect existing files unless user requested changes
4. Be efficient - don't regenerate what exists
`.trim()
  };
  
  messages.unshift(contextPrompt);
}
```

### Testing

```typescript
// tests/api/resume-with-context.test.ts
describe("Resume with Context", () => {
  it("resume triggers new execution", async () => {
    // Start execution
    const executeResp = await request(app)
      .post("/api/execute")
      .send({ prompt: "create app", sessionId: "test" });
    
    // Pause
    await request(app)
      .post("/api/sessions/test/pause")
      .send({});
    
    // Resume with adjustment
    const resumeResp = await request(app)
      .post("/api/sessions/test/resume")
      .send({ adjustment: "add login feature" });
    
    expect(resumeResp.status).toBe(200);
    expect(resumeResp.body.resumed).toBe(true);
    
    // Wait for execution to start
    await sleep(1000);
    
    // Check progress shows execution running
    const progress = await request(app)
      .get("/api/progress/snapshot/test");
    
    expect(progress.body.done).toBe(false);
  });
});
```

---

## Phase 3: BullMQ Migration (OPTIONAL - Later)

**Goal**: Distributed workers + durability  
**Time**: 4-6 hours  
**When**: Only if single-process becomes bottleneck  
**Risk**: High (major refactor)

**Defer this until**:
- MVP works with Phase 1+2
- User feedback collected
- Performance issues identified
- Need for multiple workers confirmed

**Benefits of waiting**:
- MCP tools + manifest are PORTABLE (work with or without BullMQ)
- Can validate architecture works before adding complexity
- User may not need distributed workers for MVP

---

## Implementation Order

### Tonight/Tomorrow (3-4 hours)
- [ ] Create `src/llm/tools/fsTools.ts` with read_file/list_directory/get_workspace_summary
- [ ] Create `src/orchestrator/workspaceManifest.ts` with capture/get functions
- [ ] Integrate tools into `generateJSON()` in `src/llm/index.ts`
- [ ] Add manifest capture to pause endpoint
- [ ] Write unit tests for tools
- [ ] Test manually: LLM can read output directory

### Next Session (2-3 hours)
- [ ] Update resume endpoint to trigger new execution with context
- [ ] Build enhanced system prompt with checkpoint + manifest
- [ ] Test: pause → resume with adjustment → execution continues
- [ ] Validate: LLM uses tools to understand existing state
- [ ] E2E test with Playwright

### Later (if needed)
- [ ] Research BullMQ integration patterns
- [ ] Refactor execution into BullMQ jobs
- [ ] Add Redis dependency
- [ ] Migrate checkpoint storage
- [ ] Test distributed workers

---

## Success Criteria

### Phase 1 Complete When:
✅ LLM can call read_file/list_directory tools  
✅ Workspace manifest captured at pause  
✅ Tests passing for all tools  
✅ Manual test: LLM inspects output directory successfully

### Phase 2 Complete When:
✅ Resume triggers new execution  
✅ LLM receives checkpoint + manifest in context  
✅ LLM uses tools to understand existing state  
✅ Execution continues seamlessly after resume  
✅ E2E test: pause → adjust → resume → completes

### MVP Ready When:
✅ Phase 1 + 2 complete  
✅ All tests passing (coverage maintained)  
✅ Zero lint/typecheck errors  
✅ User can pause, adjust, resume successfully  
✅ LLM context continuity validated

---

## Risk Mitigation

**Risk**: Tools don't work with OpenAI function calling  
**Mitigation**: Start with simple test, validate API works

**Risk**: Manifest becomes too large for prompt  
**Mitigation**: Send summary only (top N files), LLM requests details via tools

**Risk**: Resume execution conflicts with existing session  
**Mitigation**: Clean up old session before starting new one

**Risk**: Security - LLM reads sensitive files  
**Mitigation**: Path validation ensures only output/ directory accessible

---

## Dependency Justification (for AGENTS.md approval)

**Phase 1 & 2**: ZERO new dependencies  
- Uses Node.js built-ins: fs, path, crypto  
- No npm packages required  
- Additive changes only

**Phase 3** (if pursued later): BullMQ + ioredis + Redis  
- **Justification**: Distributed workers for scale, durability across restarts  
- **Alternative considered**: Keep single-process (sufficient for MVP)  
- **Decision**: Defer until proven necessary

---

## Alignment with Research

✅ **MCP-style filesystem tools** - Implementing  
✅ **Workspace manifest with hashes** - Implementing  
✅ **Context from files, not chat** - Implementing  
✅ **Resume triggers new execution** - Implementing  
⏳ **BullMQ step jobs** - Deferred (not MVP-critical)  
⏳ **Redis checkpoints** - Deferred (filesystem sufficient)

**Research validates this approach**:
> "Cursor maintains file-tree hashes and diffs... sends only relevant files to the model"  
> "Replit exposes filesystem operations... agent can read/edit files"  
> "They don't rely on chat history; they recompute context from file/repo state"

We're implementing EXACTLY what the research recommends, just in phases.

---

**Status**: ✅ Ready to implement Phase 1  
**Total MVP Time**: 5-7 hours (Phase 1 + 2)  
**Quality**: Production fundamentals, scales later  
**Risk**: Low-Medium (incremental, no dependencies)
