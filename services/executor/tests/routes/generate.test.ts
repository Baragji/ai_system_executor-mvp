import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/executor/writeFiles.js", () => ({
  writeFiles: vi.fn(),
}));

import { writeFiles } from "../../../../src/executor/writeFiles.js";

async function createTestApp() {
  const mod = await import("../../src/server.js");
  return mod.createApp();
}

const writeFilesMock = vi.mocked(writeFiles);

describe("POST /generate", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    writeFilesMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes executor output and writes files to disk", async () => {
    writeFilesMock.mockResolvedValueOnce();
    const app = await createTestApp();

    const response = await request(app)
      .post("/generate")
      .send({
        projectRoot: path.join(process.cwd(), "tmp"),
        output: {
          project_name: "demo",
          hasTests: false,
          files: [
            { path: "./src/index.ts", contents: "export const value = 1;" },
            { path: "./tests/index.test.ts", contents: "test('ok', () => {});" },
          ],
          notes: ["keep tests"],
        },
      })
      .expect(200);

    expect(response.body.output).toBeDefined();
    expect(response.body.output.files).toEqual([
      { path: "src/index.ts", contents: "export const value = 1;" },
      { path: "tests/index.test.ts", contents: "test('ok', () => {});" },
    ]);
    expect(writeFilesMock).toHaveBeenCalledTimes(1);
    const [rootArg, filesArg] = writeFilesMock.mock.calls[0];
    expect(path.isAbsolute(rootArg)).toBe(true);
    expect(filesArg).toEqual([
      { path: "src/index.ts", contents: "export const value = 1;" },
      { path: "tests/index.test.ts", contents: "test('ok', () => {});" },
    ]);
  });

  it("rejects payloads missing projectRoot", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/generate")
      .send({ output: { files: [] } })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({ pointer: "/projectRoot" }),
      ]),
    });
    expect(writeFilesMock).not.toHaveBeenCalled();
  });

  it("enforces hasTests when enforceTests is true", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/generate")
      .send({
        projectRoot: path.join(process.cwd(), "tmp"),
        enforceTests: true,
        output: {
          project_name: "demo",
          hasTests: false,
          files: [{ path: "src/index.ts", contents: "code" }],
        },
      })
      .expect(422);

    expect(response.body).toMatchObject({
      status: 422,
      errors: [
        { pointer: "/output/hasTests" },
      ],
    });
    expect(writeFilesMock).not.toHaveBeenCalled();
  });

  it("returns problem details when schema validation fails", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/generate")
      .send({
        projectRoot: path.join(process.cwd(), "tmp"),
        output: { project_name: "demo" },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      errors: [
        expect.objectContaining({ pointer: "/output" }),
      ],
    });
    expect(writeFilesMock).not.toHaveBeenCalled();
  });

  it("returns internal server error when writeFiles throws", async () => {
    writeFilesMock.mockRejectedValueOnce(new Error("disk full"));
    const app = await createTestApp();

    const response = await request(app)
      .post("/generate")
      .send({
        projectRoot: path.join(process.cwd(), "tmp"),
        output: {
          project_name: "demo",
          hasTests: true,
          files: [{ path: "src/index.ts", contents: "code" }],
        },
      })
      .expect(500);

    expect(response.body).toMatchObject({
      status: 500,
      title: "Internal Server Error",
      detail: "disk full",
    });
  });
});
