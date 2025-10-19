import path from "node:path";

import { Router, type Request, type Response } from "express";

import { sanitizeExecutorOutput } from "../../../../src/executor/outputProcessing.js";
import { validateExecutorOutput } from "../../../../src/executor/schema.js";
import { writeFiles } from "../../../../src/executor/writeFiles.js";
import type { ExecutorOutput } from "../../../../src/executor/types.js";
import { respondWithProblem, type ValidationError } from "../middleware/problemDetails.js";

interface GenerateRequestBody {
  projectRoot?: unknown;
  output?: unknown;
  enforceTests?: unknown;
}

function getInstance(req: Request): string {
  return req.originalUrl || req.url || "/generate";
}

function validateRequestBody(body: GenerateRequestBody): {
  errors: ValidationError[];
  projectRoot?: string;
  enforceTests: boolean;
} {
  const errors: ValidationError[] = [];
  let projectRoot: string | undefined;

  if (typeof body.projectRoot !== "string" || body.projectRoot.trim().length === 0) {
    errors.push({ pointer: "/projectRoot", detail: "projectRoot must be a non-empty string" });
  } else {
    projectRoot = body.projectRoot;
  }

  let enforceTests = false;
  if (body.enforceTests !== undefined) {
    if (typeof body.enforceTests !== "boolean") {
      errors.push({ pointer: "/enforceTests", detail: "enforceTests must be a boolean when provided" });
    } else {
      enforceTests = body.enforceTests;
    }
  }

  if (body.output === undefined) {
    errors.push({ pointer: "/output", detail: "output is required" });
  }

  return { errors, projectRoot, enforceTests };
}

export function createGenerateRouter(): Router {
  const router = Router();

  router.post("/generate", async (req: Request, res: Response) => {
    const instance = getInstance(req);
    const body = (req.body ?? {}) as GenerateRequestBody;
    const { errors, projectRoot, enforceTests } = validateRequestBody(body);

    if (errors.length > 0 || !projectRoot) {
      respondWithProblem(res, 400, "Bad Request", "Invalid generate payload", instance, { errors });
      return;
    }

    const sanitized = sanitizeExecutorOutput(body.output);
    const validation = validateExecutorOutput(sanitized);

    if (!validation.ok) {
      respondWithProblem(res, 400, "Bad Request", "Executor output failed schema validation", instance, {
        errors: [
          {
            pointer: "/output",
            detail: validation.errors,
          },
        ],
      });
      return;
    }

    const output: ExecutorOutput = validation.value;

    if (enforceTests && !output.hasTests) {
      respondWithProblem(res, 422, "Unprocessable Content", "Generated output must include tests", instance, {
        errors: [
          {
            pointer: "/output/hasTests",
            detail: "Expected hasTests to be true when enforceTests is set",
          },
        ],
      });
      return;
    }

    try {
      await writeFiles(path.resolve(projectRoot), output.files);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to write executor files";
      respondWithProblem(res, 500, "Internal Server Error", detail, instance);
      return;
    }

    res.json({ output });
  });

  return router;
}
