import { chooseProvider } from "./providers/choose.js";
import { logEvent } from "../telemetry/events.js";
import { getTraceContext } from "./trace.js";
import { writeFixture } from "../fixtures/index.js";

export type LLMMessage = { role: "system" | "user"; content: string };

export async function generateJSON(messages: LLMMessage[]): Promise<string> {
  const provider = chooseProvider();
  const maxRetries = Number(process.env.LLM_MAX_RETRIES ?? 3);
  const initialBackoff = Number(process.env.LLM_INITIAL_BACKOFF_MS ?? 1000);
  const maxBackoff = Number(process.env.LLM_MAX_BACKOFF_MS ?? 10000);
  const callTimeout = Number(process.env.LLM_CALL_TIMEOUT_MS ?? 60000);

  let attempt = 0;
  for (;;) {
    try {
      const response = await Promise.race([
        provider.generate(messages),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error(`LLM call timed out after ${callTimeout}ms`)), callTimeout))
      ]);
      // Opportunistic trace capture (only when a session is active)
      try {
        const ctx = getTraceContext();
        if (ctx?.sessionId && ctx.projectSlug) {
          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          const nameParts = [ts, ctx.phase || "llm", ctx.subtaskId || ""].filter(Boolean).join("_");
          const relPath = ["llm", `${nameParts}.json`].join("/");
          const payload = {
            provider: (process.env.LLM_PROVIDER || "openai").toLowerCase(),
            model: process.env.LLM_MODEL || null,
            attempt: attempt + 1,
            messages,
            response
          };
          await writeFixture(ctx.projectSlug, ctx.sessionId, relPath, payload);
        }
      } catch { /* best-effort only */ }
      return response;
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string; message?: string };
      const status = e?.status ?? 0;
      const code = e?.code ?? "";
      const message = e?.message ?? String(err);

      // Check if this is a timeout error from our Promise.race
      const isTimeout = message.includes("LLM call timed out");

      // Non-retryable client errors
      if (!isTimeout && (status === 400 || status === 401 || status === 403)) {
        throw err;
      }

      const retryable = isTimeout || status === 429 || status >= 500 || code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNABORTED";
      if (!retryable || attempt >= maxRetries) {
        throw err;
      }

      const base = Math.min(initialBackoff * Math.pow(2, attempt), maxBackoff);
      const jitter = 0.8 + Math.random() * 0.4; // 20% jitter
      const backoff = Math.floor(base * jitter);
      await logEvent("llm_retry", { attempt: attempt + 1, maxRetries, backoffMs: backoff, status, code, message, isTimeout });
      await new Promise(res => setTimeout(res, backoff));
      attempt += 1;
    }
  }
}
