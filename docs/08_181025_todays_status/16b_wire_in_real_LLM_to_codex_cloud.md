Got it. I read your hello-world analysis + the two Codex screenshots. Here’s how to wire Codex to make **real LLM calls** (no mocks), run **LangGraph end-to-end**, and gather evidence.

---

# TL;DR (what to do now)

1. **Turn on real network + key**

* In the Codex env panel (your screenshots), set **Internet: On** and restrict domains to:

  * `api.openai.com` (and your proxy if you use one)
  * (optionally) `registry.npmjs.org` / Playwright mirrors only if your setup script installs browsers
* Add secret **OPENAI_API_KEY** (do *not* commit this). OpenAI’s official SDK reads `OPENAI_API_KEY`. ([OpenAI Platform][1])

2. **Smoke-test the key from the container**

```bash
node -e 'import OpenAI from "openai"; const o=new OpenAI(); 
(async()=>{const r=await o.responses.create({model:"gpt-4.1-mini",input:"say ok"}); 
console.log(r.output_text)})()'
```

Expected: prints “ok”. (This uses OpenAI’s **Responses API**, the current, recommended path in 2025.) ([OpenAI Platform][1])

3. **Run the server against real LLMs**

```bash
# in the Codex container
export OPENAI_API_KEY=***                             # already set via secrets
export AGENTS_RUNTIME=langgraph                       # force LangGraph
npm ci
npm run dev
```

4. **Bypass test-time stubs when you want real calls**

* Your Vitest config aliases `@langchain/langgraph` to a stub during tests. For **real** runs, don’t import server code in tests. Instead, hit HTTP:

```bash
# Terminal A (server already running from step 3)
# Terminal B (real E2E against the HTTP API; no module alias involved)
curl -i -X POST "http://localhost:3000/api/execute" \
  -H "Content-Type: application/json" -H "X-Agents-Runtime: langgraph" \
  --data '{"project":"hello-world-app","prompt":"Return a single file: README.md with \"Hello\"."}'
# Then poll:
curl "http://localhost:3000/api/executions/<id-from-response>"
```

(Prefer the header or `?runtime=langgraph` so you’re not at the mercy of env defaults.)

5. **Simple UI path (your screenshot)**

* If the UI still defaults to StepQueue, add a **runtime override** in the client (query param or header) so clicking **Execute** hits the LangGraph path and returns **202 + executionId**.

6. **Evidence**

* Save a JSONL line when a real E2E completes:
  `.automation/evidence/langgraph/actions.jsonl`
  with `{timestamp, cmd, executionId, status, duration_ms}`.
* Keep logs showing `/api/execute ... runtime=langgraph` and the transition to **completed**.

---

## Why this is the right way (and not “fake”)

* **OpenAI 2025 stack**: the **Responses API** is the canonical interface; the official blog and SDK examples show `client.responses.create(...)` for Node/JS. Your container just needs `OPENAI_API_KEY` and egress to `api.openai.com`. ([OpenAI Platform][1])
* **LangGraph**: your goal is to exercise a real **StateGraph** at runtime, not a test double. JS docs show building a graph with nodes/edges and compiling it; that’s what you want to hit over HTTP. (JS/StateGraph concepts & quickstart.) ([LangChain AI][2])
* **About “Codex”** (the thing inside ChatGPT/Projects): public coverage describes it as an **AI coding agent** environment with containerized execution that can be online/offline; treat it like a locked-down Linux box that runs your repo with secrets. (There isn’t deep public API documentation; press coverage is consistent.) ([The Verge][3])

---

## Clean setup in your Codex **init** + **maintenance** scripts

**Init (runs on fresh container):**

```bash
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Sanity: Node and npm present
node -v && npm -v

# Install project deps deterministically
npm ci

# Optional: install Playwright browsers only if you actually run UI tests here
# npx playwright install --with-deps
```

**Maintenance (runs on cached container resume):**

```bash
#!/usr/bin/env bash
set -euo pipefail
WORKDIR="/workspace/ai_system_executor-mvp"
cd "$WORKDIR"

# Reconcile deps if package-lock changed
if ! npm ci --dry-run >/dev/null 2>&1; then npm ci; fi
```

**Env/secrets to set in Codex UI:**

* `OPENAI_API_KEY` (required)
* (optional) `OPENAI_ORG_ID` or `OPENAI_PROJECT` if you use Org/Projects scoping
* `AGENTS_RUNTIME=langgraph` (for this validation run)
* (optional) `RUN_REAL_LLM=1` to guard real E2E tests so CI doesn’t burn tokens

**Network policy:**

* **Allow**: `api.openai.com`
* (optional) `*.openai.com` if you use hosted tools like file upload or streaming
* Deny everything else unless you truly need it (npm registry, Playwright CDNs, etc.)

---

## How your IDE agent should “drive” this (so nothing falls back to mocks)

1. **Start the server** with `AGENTS_RUNTIME=langgraph` and **no test runner** involved.
2. **Use HTTP** to exercise `/api/execute` (either via your UI or curl/fetch). No imports → no Vitest alias.
3. **Confirm real model is called**: temporarily log the model name and OpenAI SDK **base URL** and **timeout** (mask the key). Response metadata from `Responses API` makes this easy to verify. ([OpenAI Platform][1])
4. **Store evidence**: the JSONL record + server logs + a saved response body.
5. **(Optional) Add a gated, real-LLM E2E test** at `tests/e2e/langgraph-real-llm.e2e.test.ts` that only runs when `RUN_REAL_LLM=1` and **never** in CI by default.

---

## Best-practice review (does this make sense?)

* **Using Responses API** with the official `openai` Node SDK is current best practice (it unifies tools, streaming, JSON output). ([OpenAI Platform][1])
* **Env-gated real E2E** (RUN_REAL_LLM=1) is standard: unit tests keep mocks for speed/determinism; a separate opt-in E2E proves production wiring with a small, cheap prompt. (Industry-standard pattern.)
* **Least-privilege network** in Codex is good security: only `api.openai.com` for real calls.
* **No imports in E2E** avoids your Vitest alias trap; you exercise the **real runtime** over HTTP.
* **LangGraph correctness** is verified at runtime, not just in tests. The JS docs (StateGraph compile/invoke, nodes/edges) match what you’re executing.

---

## If you want me to write the exact files next

* `tests/e2e/langgraph-real-llm.e2e.test.ts` (HTTP-only, polls until **completed**)
* Minimal UI tweak to pass `X-Agents-Runtime: langgraph`
* A tiny log addition in `/api/execute` to print `runtime=langgraph` + `model=<name>` (key masked)

No fluff, no stubs—pure live call path.

[1]: https://platform.openai.com/docs/api-reference/responses?utm_source=chatgpt.com "Responses API reference"
[2]: https://langchain-ai.github.io/langgraphjs/?utm_source=chatgpt.com "LangGraph.js"
[3]: https://www.theverge.com/command-line-newsletter/668251/chatgpt-is-getting-an-ai-coding-agent?utm_source=chatgpt.com "ChatGPT is getting an AI coding agent"
