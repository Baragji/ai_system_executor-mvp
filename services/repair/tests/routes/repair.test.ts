import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/repair/multiTurnRepair.js", () => ({
  multiTurnRepair: vi.fn(),
}));

vi.mock("../../../../src/repair/repairOnce.js", () => ({
  repairOnce: vi.fn(),
}));

import { multiTurnRepair } from "../../../../src/repair/multiTurnRepair.js";
import { repairOnce, type RepairOutcome } from "../../../../src/repair/repairOnce.js";
import type { RepairHistory } from "../../../../src/contracts/repairHistoryValidator.js";
import type { RunResult } from "../../../../src/contracts/validators.js";

async function createTestApp() {
  const mod = await import("../../src/server.js");
  return mod.createApp();
}

const multiTurnRepairMock = vi.mocked(multiTurnRepair);
const repairOnceMock = vi.mocked(repairOnce);

const baseRunResult: RunResult = {
  status: "fail",
  passCount: 1,
  failCount: 1,
  durationMs: 1200,
  logsPath: "logs/latest.log",
  timestamp: new Date().toISOString(),
};

const baseContext = {
  projectPath: "/tmp/project",
  originalPrompt: "Fix the failing tests",
  generatedFiles: ["src/index.ts"],
  initialTestResult: baseRunResult,
  sessionId: "session-123",
};

const repairArgs = {
  projectRoot: "/tmp/project",
  projectSlug: "project",
  failure: baseRunResult,
  originalFiles: [
    {
      path: "src/index.ts",
      contents: "export const value = 1;",
    },
  ],
  prompt: "Fix the failure",
  sessionId: "session-123",
};

describe("POST /repair", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    multiTurnRepairMock.mockReset();
    repairOnceMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("executes multi-turn repair when no mode is provided", async () => {
    const history: RepairHistory = {
      attempts: [
        {
          number: 1,
          status: "fail",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "Attempted fix",
          testResult: baseRunResult,
          durationMs: 1200,
          cumulativeTime: 1200,
        },
      ],
      finalStatus: "fail",
      totalAttempts: 1,
    };
    multiTurnRepairMock.mockResolvedValueOnce(history);

    const app = await createTestApp();

    const response = await request(app)
      .post("/repair")
      .send({ context: baseContext })
      .expect(200);

    expect(response.body).toEqual({ history });
    expect(multiTurnRepairMock).toHaveBeenCalledWith(baseContext);
  });

  it("returns validation error when context is missing", async () => {
    const app = await createTestApp();

    const response = await request(app).post("/repair").send({}).expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      errors: [
        {
          pointer: "/context",
        },
      ],
    });
  });

  it("returns problem details when multiTurnRepair throws", async () => {
    multiTurnRepairMock.mockRejectedValueOnce(new Error("repair failed"));

    const app = await createTestApp();

    const response = await request(app)
      .post("/repair")
      .send({ context: baseContext })
      .expect(500);

    expect(response.body).toMatchObject({
      status: 500,
      title: "Internal Server Error",
      detail: "repair failed",
    });
  });

  it("executes single-attempt repair when mode is single", async () => {
    const outcome: RepairOutcome = {
      attempted: true,
      repaired: true,
      appliedFiles: 1,
      artifacts: [],
      notes: ["applied fix"],
      runResult: baseRunResult,
    };
    repairOnceMock.mockResolvedValueOnce(outcome);

    const app = await createTestApp();

    const response = await request(app)
      .post("/repair")
      .send({ mode: "single", args: repairArgs })
      .expect(200);

    expect(response.body).toEqual({ outcome });
    expect(repairOnceMock).toHaveBeenCalledWith(repairArgs);
  });

  it("returns validation error when single attempt args are invalid", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/repair")
      .send({ mode: "single" })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      errors: [
        {
          pointer: "/args",
        },
      ],
    });
  });

  it("returns problem details when repairOnce throws", async () => {
    repairOnceMock.mockRejectedValueOnce(new Error("llm unavailable"));

    const app = await createTestApp();

    const response = await request(app)
      .post("/repair")
      .send({ mode: "single", args: repairArgs })
      .expect(500);

    expect(response.body).toMatchObject({
      status: 500,
      title: "Internal Server Error",
      detail: "llm unavailable",
    });
  });
});
