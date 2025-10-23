import express from "express";
import type { Application } from "express";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";

type ChildProcessModule = typeof import("node:child_process");
type SpawnFn = ChildProcessModule["spawn"];

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<ChildProcessModule>("node:child_process");
  return {
    ...actual,
    spawn: vi.fn<ReturnType<SpawnFn>, Parameters<SpawnFn>>()
  } satisfies ChildProcessModule;
});

import * as childProcess from "node:child_process";

const spawnMock = vi.mocked(childProcess.spawn);

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const defaultZipFactory = () => {
  const stream = new PassThrough();
  return {
    outputStream: stream,
    addEmptyDirectory: vi.fn(),
    addFile: vi.fn(),
    end: vi.fn(() => {
      stream.end("zip-output");
    })
  };
};

const zipFactory = {
  create: defaultZipFactory
};
const zipInstances: Array<ReturnType<typeof zipFactory.create>> = [];

vi.mock("yazl", () => ({
  ZipFile: class {
    outputStream: PassThrough;
    addEmptyDirectory: (dir: string) => void;
    addFile: (abs: string, rel: string) => void;
    end: () => void;

    constructor() {
      const impl = zipFactory.create();
      zipInstances.push(impl);
      this.outputStream = impl.outputStream;
      this.addEmptyDirectory = impl.addEmptyDirectory;
      this.addFile = impl.addFile;
      this.end = impl.end;
    }
  }
}));

import { mountFilesRoutes, type FilesDeps } from "../../../src/domains/files/routes.ts";

describe("files routes", () => {
  let app: Application;
  let deps: FilesDeps;
  let outputDir: string;

  const slug = "project-slug";
  function mockSpawn(
    child: childProcess.ChildProcessWithoutNullStreams,
    onSpawn?: () => void
  ) {
    spawnMock.mockImplementation(() => {
      onSpawn?.();
      return child;
    });
    return spawnMock;
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "files-routes-"));
    deps = {
      slugify: vi.fn<FilesDeps["slugify"]>().mockReturnValue(slug),
      outputDir
    } satisfies FilesDeps;
    mountFilesRoutes(app, deps);
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
    zipFactory.create = defaultZipFactory;
    zipInstances.length = 0;
    spawnMock.mockReset();
    vi.restoreAllMocks();
  });

  function projectRoot(): string {
    return path.join(outputDir, slug);
  }

  describe("/output-archive", () => {
    it("returns 403 when path escapes project root", async () => {
      const response = await request(app).get("/output-archive/Project/..%2Fsecret");
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "forbidden" });
    });

    it("returns 404 when project directory missing", async () => {
      const response = await request(app).get("/output-archive/Project");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "not found" });
    });

    it("returns 400 when target is not a directory", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "file.txt"), "hello");

      const response = await request(app).get("/output-archive/Project/file.txt");
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "path must be a directory" });
    });

    it("streams zip archive by default", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "log.txt"), "contents");

      const response = await request(app).get("/output-archive/Project");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("application/zip");
      expect(response.headers["content-disposition"]).toContain("project-slug.zip");
      expect(response.text).toBe("zip-output");
      expect(zipInstances[0]?.addFile).toHaveBeenCalled();
    });

    it("handles zip stream errors", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      zipFactory.create = () => {
        const stream = new PassThrough();
        return {
          outputStream: stream,
          addEmptyDirectory: vi.fn(),
          addFile: vi.fn(),
          end: vi.fn(() => {
            stream.emit("error", new Error("zip failed"));
            stream.end();
          })
        };
      };
      await fs.writeFile(path.join(root, "file.txt"), "data");

      const response = await request(app).get("/output-archive/Project");

      expect(response.status).toBe(500);
      expect(response.text).toContain("zip failed");
    });

    it("streams tar archive when requested", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      await fs.mkdir(path.join(root, "nested"), { recursive: true });
      await fs.writeFile(path.join(root, "nested", "file.txt"), "data");

      const child = new (class extends EventEmitter {
        stdout = new PassThrough();
        stderr = new PassThrough();
      })();
      const spawnMock = mockSpawn(
        child as unknown as childProcess.ChildProcessWithoutNullStreams,
        () => {
          setTimeout(() => {
            child.stderr.emit("data", Buffer.from("warn"));
            child.stdout.write("chunk");
            child.stdout.end();
            child.emit("close", 0);
          }, 0);
        }
      );

      const responsePromise = request(app).get("/output-archive/Project?format=tar");

      const response = await responsePromise;
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("application/gzip");
      expect(response.headers["content-disposition"]).toContain("project-slug.tar.gz");
      const body = response.body instanceof Buffer ? response.body.toString() : response.text ?? "";
      expect(body).toBe("chunk");
      expect(spawnMock).toHaveBeenCalledWith("tar", ["-czf", "-", "-C", root, "."]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("returns 501 when tar binary missing", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      const child = new (class extends EventEmitter {
        stdout = new PassThrough();
        stderr = new PassThrough();
      })();
      mockSpawn(child as unknown as childProcess.ChildProcessWithoutNullStreams, () => {
        setTimeout(() => {
          child.emit("error", Object.assign(new Error("no tar"), { code: "ENOENT" }));
          child.emit("close", 1);
        }, 0);
      });

      child.on("error", () => {});
      const responsePromise = request(app).get("/output-archive/Project?format=tar");

      const response = await responsePromise;
      expect(response.status).toBe(501);
      const body = response.text ?? (response.body instanceof Buffer ? response.body.toString() : "");
      expect(body).toBe("tar is not available on this system");
    });

    it("returns 500 when tar command fails", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      const child = new (class extends EventEmitter {
        stdout = new PassThrough();
        stderr = new PassThrough();
      })();
      mockSpawn(child as unknown as childProcess.ChildProcessWithoutNullStreams, () => {
        setTimeout(() => {
          child.emit("error", new Error("tar failure"));
          child.emit("close", 1);
        }, 0);
      });

      child.on("error", () => {});
      const responsePromise = request(app).get("/output-archive/Project?format=tar");

      const response = await responsePromise;
      expect(response.status).toBe(500);
      const body = response.text ?? (response.body instanceof Buffer ? response.body.toString() : "");
      expect(body).toBe("failed to create archive");
    });

    it("ends response when tar exits with non-zero code", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      const child = new (class extends EventEmitter {
        stdout = new PassThrough();
        stderr = new PassThrough();
      })();
      mockSpawn(child as unknown as childProcess.ChildProcessWithoutNullStreams);

      const responsePromise = request(app).get("/output-archive/Project?format=tar");
      await new Promise(resolve => setImmediate(resolve));
      child.stdout.end();
      child.emit("close", 1);

      const response = await responsePromise;
      expect(response.status).toBe(200);
      const body = response.body instanceof Buffer ? response.body : Buffer.from(response.text ?? "", "utf-8");
      expect(body.length).toBe(0);
    });
  });

  describe("/output", () => {
    it("calls next when directory is missing", async () => {
      app.use((_req, res) => {
        res.status(418).send("next");
      });

      const response = await request(app).get("/output/Project");
      expect(response.status).toBe(418);
      expect(response.text).toBe("next");
    });

    it("calls next when target is a file", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "file.txt"), "content");

      app.use((_req, res) => {
        res.status(418).send("next");
      });

      const response = await request(app).get("/output/Project/file.txt");
      expect(response.status).toBe(418);
      expect(response.text).toBe("next");
    });

    it("returns 403 when escaping project root", async () => {
      const response = await request(app).get("/output/Project/..%2Fsecret");
      expect(response.status).toBe(403);
      expect(response.text).toBe("forbidden");
    });

    it("renders directory index with archive links", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      await fs.mkdir(path.join(root, "subdir"));
      const filePath = path.join(root, "note.txt");
      await fs.writeFile(filePath, "hello world");

      const realStat = fs.stat;
      const statSpy = vi.spyOn(fs, "stat").mockImplementation(async target => {
        if (typeof target === "string" && target.endsWith("missing.bin")) {
          throw new Error("stat failed");
        }
        return realStat(target as Parameters<typeof fs.stat>[0]);
      });

      await fs.writeFile(path.join(root, "missing.bin"), "");

      const response = await request(app).get("/output/Project/");
      // console.log('directory response', response.status, response.text);
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Download .zip");
      expect(response.text).toContain("Download .tar.gz");
      expect(response.text).toContain("note.txt");
      expect(response.text).toContain("subdir/");

      statSpy.mockRestore();
    });
  });

  describe("/api/files", () => {
    it("returns 403 when escaping project root", async () => {
      const response = await request(app).get("/api/files/Project/..%2F..%2Fsecret.txt");
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "forbidden" });
    });

    it("returns 404 when file missing", async () => {
      const response = await request(app).get("/api/files/Project/output.txt");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "not found" });
    });

    it("returns 404 when path is directory", async () => {
      const root = projectRoot();
      await fs.mkdir(path.join(root, "folder"), { recursive: true });

      const response = await request(app).get("/api/files/Project/folder");
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "not found" });
    });

    it("returns file contents for text file", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      const file = path.join(root, "note.txt");
      await fs.writeFile(file, "hello");

      const response = await request(app).get("/api/files/Project/note.txt");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        content: "hello",
        binary: false,
        size: 5
      });
      expect(typeof response.body.modified).toBe("string");
    });

    it("returns metadata for binary file", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      const file = path.join(root, "data.bin");
      await fs.writeFile(file, Buffer.from([0, 255]));

      const response = await request(app).get("/api/files/Project/data.bin");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        content: null,
        binary: true,
        size: 2
      });
    });

    it("returns 404 when read fails", async () => {
      const root = projectRoot();
      await fs.mkdir(root, { recursive: true });
      const file = path.join(root, "bad.txt");
      await fs.writeFile(file, "test");
      const readSpy = vi.spyOn(fs, "readFile").mockRejectedValueOnce(new Error("boom"));

      const response = await request(app).get("/api/files/Project/bad.txt");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "not found" });
      readSpy.mockRestore();
    });
  });
});
