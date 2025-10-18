import { describe, it, expect } from "vitest";

// This e2e test verifies a real LLM-backed execution path via HTTP against a
// separately started dev server. It is opt-in and will be skipped unless
// RUN_REAL_LLM=1 is set. Start the server in another shell with:
//   AGENTS_RUNTIME=langgraph npm run dev

const RUN = process.env.RUN_REAL_LLM === "1";
const BASE_URL = process.env.LANGGRAPH_BASE_URL || "http://localhost:3000";

(RUN ? describe : describe.skip)("langgraph e2e (real LLM)", () => {
  it("POST /api/execute returns 202 and completes via polling", async () => {
    // Kick off an execution with a small prompt to keep costs minimal.
    const startResp = await fetch(`${BASE_URL}/api/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "hello-world-e2e",
        prompt: "Create a minimal Node+TS Hello World project with a single passing test.",
        deterministic: false
      })
    });

    expect(startResp.status).toBe(202);
    const startJson = (await startResp.json()) as { executionId?: string; status?: string };
    expect(startJson.executionId).toBeTruthy();

    const execId = startJson.executionId!;
    const pollUrl = `${BASE_URL}/api/executions/${execId}`;

    let completed = false;
    for (let i = 0; i < 120; i += 1) {
      await new Promise(r => setTimeout(r, 1000));
      const poll = await fetch(pollUrl);
      expect(poll.status).toBe(200);
      const body = (await poll.json()) as { status?: string; result?: unknown };
      if (body.status === "failed") {
        throw new Error(`Execution failed for ${execId}`);
      }
      if (body.status === "completed") {
        expect(body.result).toBeTruthy();
        completed = true;
        break;
      }
    }

    if (!completed) {
      throw new Error("Execution did not complete within 120s");
    }
  }, 180_000);
});

