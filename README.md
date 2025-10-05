# Executor MVP (Local)

A tiny, local *Executor Agent* that turns your prompt into a set of files (via LLM), validates them against a JSON schema, writes them into `./output/<project>`, and serves them for browsing.

## Quickstart

```bash
cp .env.example .env
# set your API key(s) and model in .env

pnpm i   # or: npm i
pnpm dev # or: npm run dev

# open:
http://localhost:3000
```

Use a prompt like:  
**Make a minimal Node+TypeScript Hello World HTTP server exposing GET / returning "Hello World". Include README.md with run steps.**

Files are written to `./output/<project>`.

## Contract
- `contracts/executor-output.schema.json`
- `src/executor/systemPrompt.md`
