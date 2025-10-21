import { fetchJson } from "../lib/httpClient.js";

type RunStatus = "pass" | "fail" | "error";

type RunResult = {
  status: RunStatus;
  passCount: number;
  failCount: number;
  durationMs: number;
  logsPath: string;
  timestamp: string;
  command?: string;
  exitCode?: number;
  signal?: string;
  timedOut?: boolean;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
};

export async function run(options: {
  projectRoot: string;
  projectSlug: string;
  command?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  sessionId?: string;
}): Promise<RunResult> {
  const base = process.env.RUNNER_URL?.trim();
  if (!base) throw new Error("RUNNER_URL is not set");

  const url = new URL("/run", `${base}/`).toString();
  return await fetchJson<RunResult>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options),
  });
}

