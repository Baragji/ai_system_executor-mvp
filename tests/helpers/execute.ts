import type { SuperTest, Test } from "supertest";

import type { ExecutionRecord } from "../../src/orchestrator/executionsStore.js";

export interface ExecuteOptions {
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export interface ExecuteResult<T = unknown> {
  initialStatus: number;
  finalStatus: number;
  payload: T;
  executionId?: string;
  location?: string;
  record?: ExecutionRecord;
  initialBody: unknown;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function postExecuteAndWait<T = unknown>(
  client: SuperTest<Test>,
  payload: unknown,
  options: ExecuteOptions = {}
): Promise<ExecuteResult<T>> {
  const initial = await client.post("/api/execute").send(payload);

  if (initial.status !== 202) {
    return {
      initialStatus: initial.status,
      finalStatus: initial.status,
      payload: initial.body as T,
      initialBody: initial.body
    };
  }

  const location = initial.headers["location"];
  if (typeof location !== "string" || !location) {
    throw new Error("LangGraph runtime response missing Location header");
  }

  const pollInterval = options.pollIntervalMs ?? 20;
  const pollTimeout = options.pollTimeoutMs ?? 5000;
  const deadline = Date.now() + pollTimeout;

  let lastRecord: ExecutionRecord | null = null;
  let finalStatus = 200;

  while (Date.now() <= deadline) {
    const poll = await client.get(location);
    finalStatus = poll.status;
    if (poll.status !== 200) {
      throw new Error(`Polling ${location} failed with status ${poll.status}`);
    }

    const record = poll.body as ExecutionRecord;
    lastRecord = record;

    if (record.status === "completed") {
      return {
        initialStatus: initial.status,
        finalStatus,
        payload: (record.result ?? undefined) as T,
        executionId: record.id,
        location,
        record,
        initialBody: initial.body
      };
    }

    if (record.status === "failed") {
      const reason = record.error ?? "execution failed";
      throw new Error(reason);
    }

    await sleep(pollInterval);
  }

  throw new Error(
    lastRecord
      ? `Execution ${lastRecord.id} did not complete within ${pollTimeout}ms`
      : `Execution did not complete within ${pollTimeout}ms`
  );
}
