// BFF/Gateway Health Checks - checks all backends
import express from "express";
import { runChecks, httpCheck } from "./shared";

const router = express.Router();

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    auth: httpCheck("auth", process.env.AUTH_READY_URL || "http://auth:8080/readyz"),
    projects: httpCheck("projects", process.env.PROJECTS_READY_URL || "http://projects:8080/readyz"),
    files: httpCheck("files", process.env.FILES_READY_URL || "http://files:8080/readyz"),
    runner: httpCheck("runner", process.env.RUNNER_READY_URL || "http://runner:8080/readyz"),
    collab: httpCheck("collab", process.env.COLLAB_READY_URL || "http://collab:8080/readyz"),
    deployments: httpCheck("deployments", process.env.DEPLOY_READY_URL || "http://deploy:8080/readyz"),
    evidence: httpCheck("evidence", process.env.EVIDENCE_READY_URL || "http://evidence:8080/readyz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
