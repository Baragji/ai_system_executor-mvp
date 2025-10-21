import { fetchJson } from "../lib/httpClient.js";
import type { RepairHistory } from "./types.js";

export async function multiTurn(context: unknown): Promise<RepairHistory> {
  const base = process.env.REPAIR_URL?.trim();
  if (!base) throw new Error("REPAIR_URL is not set");

  const url = new URL("/repair", `${base}/`).toString();
  const result = await fetchJson<{ history: RepairHistory }>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ context }),
  });

  return result.history;
}

