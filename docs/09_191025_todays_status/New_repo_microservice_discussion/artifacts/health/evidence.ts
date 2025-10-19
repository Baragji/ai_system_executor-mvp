// Evidence Service Health Checks
import express from "express";
import { runChecks, httpCheck } from "./shared";
import { Pool } from "pg";

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    postgres: async () => { await pg.query("select 1"); },
    object_store: httpCheck("objstore", process.env.OBJSTORE_HEALTH_URL || "http://minio:9000/health/live"),
    signer: httpCheck("cosign", process.env.COSIGN_HEALTH_URL || "http://signer:8080/healthz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
