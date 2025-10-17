import { describe, expect, it } from "vitest";

import { CHECKPOINT_SCHEMA_ID, CHECKPOINT_VERSION } from "../../src/orchestrator/checkpoints.js";
import { buildResumePrompts } from "../../src/orchestrator/resumePrompt.js";

describe("buildResumePrompts", () => {
  it("injects resume guidance and manifest details", () => {
    const checkpoint = {
      schema: CHECKPOINT_SCHEMA_ID,
      version: CHECKPOINT_VERSION,
      sessionId: "resume-session",
      state: "GENERATING",
      updatedAt: "2025-10-11T00:00:00.000Z",
      machine: {
        history: [
          { state: "GENERATING", enteredAt: "2025-10-11T00:00:00.000Z" },
          { state: "PAUSED", enteredAt: "2025-10-11T00:05:00.000Z" }
        ]
      },
      payload: {
        executor: { projectSlug: "demo-project" }
      }
    } as const;

    const manifest = {
      sessionId: "resume-session",
      projectSlug: "demo-project",
      capturedAt: "2025-10-11T00:05:05.000Z",
      files: [
        { path: "src/index.ts", size: 1024, hash: "abcd1234", modified: "2025-10-11T00:05:00.000Z" },
        { path: "README.md", size: 256, hash: "efgh5678", modified: "2025-10-11T00:05:00.000Z" }
      ],
      summary: {
        totalFiles: 2,
        totalSize: 1280,
        topFiles: [
          { path: "src/index.ts", size: 1024, hash: "abcd1234", modified: "2025-10-11T00:05:00.000Z" },
          { path: "README.md", size: 256, hash: "efgh5678", modified: "2025-10-11T00:05:00.000Z" }
        ],
        tree: {}
      }
    };

    const prompts = buildResumePrompts("Base System Prompt", {
      projectSlug: "demo-project",
      originalPrompt: "Build a todo app",
      effectivePrompt: "Build a todo app with filtering",
      adjustment: "Add persistence",
      checkpoint,
      answeredQuestions: [
        { id: "q1", question: "Which DB?", type: "AMBIGUITY", answer: "Use sqlite" }
      ],
      manifest
    });

    expect(prompts.systemPrompt).toContain("Resume Guidance");
    expect(prompts.systemPrompt).toContain("MCP tools");

    expect(prompts.userPrompt).toContain("## Original Objective");
    expect(prompts.userPrompt).toContain("Build a todo app");
    expect(prompts.userPrompt).toContain("## User Adjustment");
    expect(prompts.userPrompt).toContain("Add persistence");
    expect(prompts.userPrompt).toContain("src/index.ts (1 KB");
    expect(prompts.userPrompt).toContain("Which DB? → Use sqlite");
    expect(prompts.userPrompt).toContain("Execution Guidance");
  });
});
