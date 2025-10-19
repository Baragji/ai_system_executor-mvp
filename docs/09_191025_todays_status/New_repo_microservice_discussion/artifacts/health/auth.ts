// Auth Service Health Checks
import express from "express";
import { runChecks } from "./shared";
import { Pool } from "pg";
import Redis from "ioredis";

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL!);

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));

router.get("/readyz", async (_req, res) => {
  const checks = {
    postgres: async () => { await pg.query("select 1"); },
    redis: async () => { await redis.ping(); }
  };
  try {
    const result = await runChecks(checks);
    res.json({ status: "ready", checks: result });
  } catch (e: any) {
    res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details });
  }
});

export default router;
