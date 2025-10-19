import path from "node:path";

import { Router, type Request, type Response } from "express";

import { validateFilesNonEmpty } from "../../../../src/utils/validateFiles.js";
import { respondWithProblem, type ValidationError } from "../middleware/problemDetails.js";

interface ValidateRequestBody {
  projectRoot?: unknown;
  paths?: unknown;
}

function getInstance(req: Request): string {
  return req.originalUrl || req.url || "/validate";
}

function isUnsafeRelativePath(candidate: string): boolean {
  if (!candidate) return true;
  if (path.isAbsolute(candidate)) return true;
  if (/^[A-Za-z]:/.test(candidate)) return true;
  const normalized = path.normalize(candidate).replace(/\\/g, "/");
  return normalized === ".." || normalized.startsWith("../");
}

function validateRequestBody(body: ValidateRequestBody): {
  errors: ValidationError[];
  projectRoot?: string;
  paths?: string[];
} {
  const errors: ValidationError[] = [];
  let projectRoot: string | undefined;
  let paths: string[] | undefined;

  if (typeof body.projectRoot !== "string" || body.projectRoot.trim().length === 0) {
    errors.push({ pointer: "/projectRoot", detail: "projectRoot must be a non-empty string" });
  } else {
    projectRoot = body.projectRoot;
  }

  if (!Array.isArray(body.paths)) {
    errors.push({ pointer: "/paths", detail: "paths must be an array of relative file paths" });
  } else {
    const collected: string[] = [];
    body.paths.forEach((value, index) => {
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push({ pointer: `/paths/${index}`, detail: "Each path must be a non-empty string" });
        return;
      }
      const trimmed = value.trim();
      if (isUnsafeRelativePath(trimmed)) {
        errors.push({ pointer: `/paths/${index}`, detail: "Paths must be relative to the project root" });
        return;
      }
      collected.push(trimmed.replace(/^\.\/+/, ""));
    });
    paths = collected;
  }

  return { errors, projectRoot, paths };
}

export function createValidateRouter(): Router {
  const router = Router();

  router.post("/validate", async (req: Request, res: Response) => {
    const instance = getInstance(req);
    const body = (req.body ?? {}) as ValidateRequestBody;
    const { errors, projectRoot, paths } = validateRequestBody(body);

    if (errors.length > 0 || !projectRoot || paths === undefined) {
      respondWithProblem(res, 400, "Bad Request", "Invalid validate payload", instance, { errors });
      return;
    }

    try {
      const result = await validateFilesNonEmpty(path.resolve(projectRoot), paths);
      res.json(result);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to validate files";
      respondWithProblem(res, 500, "Internal Server Error", detail, instance);
    }
  });

  return router;
}
