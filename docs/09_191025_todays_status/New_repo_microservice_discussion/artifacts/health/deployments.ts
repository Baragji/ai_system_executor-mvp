// Deployments Service Health Checks
import express from "express";
import { runChecks, httpCheck } from "./shared";
import k8s from "@kubernetes/client-node";

const router = express.Router();
const kc = new k8s.KubeConfig(); kc.loadFromDefault();
const k8sCore = kc.makeApiClient(k8s.CoreV1Api);

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    k8s_api: async () => { await k8sCore.getCode(); },
    runner: httpCheck("runner", process.env.RUNNER_READY_URL || "http://runner:8080/readyz"),
    evidence: httpCheck("evidence", process.env.EVIDENCE_READY_URL || "http://evidence:8080/readyz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
