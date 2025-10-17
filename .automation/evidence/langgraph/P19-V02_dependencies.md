# P19-V02 – LangGraph runtime dependency installation

## Dependencies added
- Installed `@langchain/core` at `0.3.78` and `@langchain/langgraph` at `0.4.9` as exact runtime dependencies to support the feature-flagged orchestrator work. 【F:package.json†L41-L45】
- Lockfile shows the application root now declaring both packages with exact versions, keeping other dependency ranges unchanged. 【F:package-lock.json†L7-L33】

## Resolved package metadata
- `@langchain/core@0.3.78` pulls LangSmith tooling, queue utilities, and schema helpers, matching LangGraph’s peer requirement range. 【F:package-lock.json†L1395-L1416】【F:package-lock.json†L1469-L1477】
- `@langchain/langgraph@0.4.9` installs checkpoint and SDK helpers plus UUID/Zod dependencies, all MIT-licensed and Node 18+ compatible. 【F:package-lock.json†L1455-L1488】

## Commands executed
- `npm install --save-exact @langchain/langgraph @langchain/core` (adds packages and refreshes lockfile). 【4e8a8a†L1-L11】
- `test -f package-lock.json` (contract validation confirming lockfile exists). 【7cfde8†L1-L2】

## Validation
- Contract validation command returned exit code 0; no additional forbidden dependencies were introduced, and lockfile integrity is preserved. 【7cfde8†L1-L2】【F:package-lock.json†L1395-L1488】
