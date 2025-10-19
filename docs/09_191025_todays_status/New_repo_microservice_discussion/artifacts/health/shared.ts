// Shared health check utilities
// Use in all services for /healthz and /readyz endpoints

import fetch from "node-fetch";

export type Check = () => Promise<void>;

export function httpCheck(name: string, url: string, timeoutMs = 1500): Check {
  return () =>
    new Promise<void>((resolve, reject) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeoutMs);
      fetch(url, { signal: ctl.signal })
        .then((r) => (r.ok ? resolve() : reject(new Error(`${name}: ${r.status}`))))
        .catch((e) => reject(new Error(`${name}: ${String(e)}`)))
        .finally(() => clearTimeout(t));
    });
}

export async function runChecks(checks: Record<string, Check>) {
  const results: Record<string, string> = {};
  const failures: string[] = [];
  await Promise.all(
    Object.entries(checks).map(async ([k, fn]) => {
      try {
        await fn();
        results[k] = "ok";
      } catch (e: any) {
        results[k] = `fail: ${e.message || e}`;
        failures.push(k);
      }
    })
  );
  if (failures.length) {
    const err = new Error(`deps failing: ${failures.join(",")}`);
    (err as any).details = results;
    throw err;
  }
  return results;
}
