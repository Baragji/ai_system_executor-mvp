# GitHub Codespace Setup for Phase 21 Execution

## Quick Start (3 Steps)

### Step 1: Add OpenAI API Key to Repository Secrets

1. Go to: https://github.com/Baragji/ai_system_executor-mvp/settings/secrets/codespaces
2. Click "New repository secret"
3. Name: `OPENAI_API_KEY`
4. Value: Your actual OpenAI API key (starts with `sk-`)
5. Click "Add secret"

**Security:** This secret is NEVER committed to git. GitHub injects it into the container at runtime.

---

### Step 2: Push `.devcontainer/devcontainer.json` to GitHub

```bash
# Already created locally, just commit and push:
git add .devcontainer/devcontainer.json
git commit -m "feat: add Codespace config for Phase 21 LangGraph execution"
git push origin fix/wf5-g3-context-and-evidence
```

---

### Step 3: Launch Codespace

1. Go to: https://github.com/Baragji/ai_system_executor-mvp
2. Click "Code" button (green)
3. Click "Codespaces" tab
4. Click "Create codespace on fix/wf5-g3-context-and-evidence"
5. Wait ~2 minutes for container build

**What happens automatically:**
- Node.js 20 installed
- `npm install` runs
- `npm run typecheck` validates code
- `npm run lint` checks style
- `OPENAI_API_KEY` injected from secrets
- `AGENTS_RUNTIME=langgraph` set
- `RUN_REAL_LLM=1` enabled

---

## Verification Commands (Run in Codespace Terminal)

```bash
# 1. Check API key is present (should show sk-...)
echo $OPENAI_API_KEY

# 2. Verify environment flags
echo $AGENTS_RUNTIME    # Should show: langgraph
echo $RUN_REAL_LLM      # Should show: 1

# 3. Run real LLM test (proves OpenAI access works)
RUN_REAL_LLM=1 npm test tests/e2e/llm-live-openai.test.ts --run
# Expected: PASS in ~4 seconds

# 4. Check LangGraph version
npm list @langchain/langgraph
# Expected: @langchain/langgraph@1.0.0
```

---

## Execute Phase 21 Contract

Once verification passes, Codex can execute the contract:

```bash
# Start development server with LangGraph runtime
AGENTS_RUNTIME=langgraph npm run dev

# Server will be available at:
# https://<codespace-name>-3000.app.github.dev
```

---

## Evidence Collection

All Phase 21 evidence automatically written to:
- `.automation/evidence/langgraph/actions.jsonl` (SIEM log)
- `.automation/test_logs/` (test outputs)
- `.automation/execution_trace.jsonl` (full execution trace)

These files are gitignored but can be committed manually for gate evidence.

---

## Troubleshooting

### "OPENAI_API_KEY not found"
- Check secret exists: https://github.com/Baragji/ai_system_executor-mvp/settings/secrets/codespaces
- Rebuild container: Codespace menu → "Rebuild Container"

### "Cannot connect to api.openai.com"
- Codespaces allows all outbound internet by default
- Test manually: `curl -I https://api.openai.com/v1/models`

### "Tests timeout"
- Increase timeout in test file: `{ timeout: 600000 }` (10 minutes)
- Or skip dependency install with dev flag (see 16b_wire_in_real_LLM_to_codex_cloud.md)

---

## Security Notes

- Secret stored in GitHub encrypted vault
- Injected at container runtime only
- NEVER appears in git history
- NEVER logged to console (masked in GitHub Actions)
- Scoped to repository only

---

## Cost Notes

- **Codespaces free tier:** 60 hours/month (GitHub Pro)
- **OpenAI API costs:** Phase 21 execution estimated ~$0.50-$2.00 depending on test iterations
- **Alternative:** Run locally with `.env.local` (not committed) if you want to avoid Codespaces usage

---

## Next Step for Codex

Once Codespace is running and verification passes, Codex should:

1. Read Phase 21 contract: `contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json`
2. Execute tasks P21-V02 and P21-V03 per roadmap
3. Collect evidence in `.automation/evidence/langgraph/`
4. Update Gate G3.1 in `.automation/GATES_LEDGER.md` when complete

**Execution command:**
```bash
# Codex will run this to start implementation:
npm run state:next:dry    # Shows next suggested action
npm run state:next        # Executes with confirmation
```
