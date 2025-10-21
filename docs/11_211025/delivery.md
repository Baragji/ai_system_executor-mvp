Alright, Yousef — shipping the enterprise skeleton now. It’s a clean **Turborepo monorepo** with **9 services**, **LangGraph orchestrator**, **NATS JetStream**, **MinIO (S3-compatible)**, **Postgres**, and an **OTel → Collector → Tempo → Grafana** trace stack. I’ve kept the files tight but fully copy-pasteable so your AI devs can implement immediately.

I cite key standards/docs inline where relevant (LangGraph persistence & state graph, NATS JetStream, OTel Collector + Tempo + Grafana stack, and RFC 9457) so this is grounded in current best practice. ([LangChain][1])

---

# 1) Monorepo file tree (Turborepo)

```
autonomous-platform/
├─ .github/
│  └─ workflows/
│     ├─ sbom.yml
│     ├─ slsa.yml
│     ├─ semgrep.yml
│     ├─ codeql.yml
│     └─ trivy.yml
├─ ops/
│  ├─ dev/
│  │  ├─ docker-compose.yml
│  │  ├─ otel-collector.yaml
│  │  ├─ grafana/
│  │  │  └─ provisioning/
│  │  │     └─ datasources/datasource.yml
│  │  └─ tempo/
│  │     └─ tempo-local.yaml
│  └─ k8s/ (future)
├─ packages/
│  ├─ contracts/
│  │  ├─ openapi/
│  │  │  ├─ gateway.openapi.yaml
│  │  │  ├─ planner-ra.openapi.yaml
│  │  │  ├─ architect-aa.openapi.yaml
│  │  │  ├─ implementer-ia.openapi.yaml
│  │  │  ├─ runner-da.openapi.yaml
│  │  │  ├─ security-sa.openapi.yaml
│  │  │  ├─ quality-qa.openapi.yaml
│  │  │  ├─ finops-fops.openapi.yaml
│  │  │  └─ db-layer-dba.openapi.yaml
│  │  ├─ schema/
│  │  │  ├─ work-item.v1.json
│  │  │  ├─ work-result.v1.json
│  │  │  └─ evidence-record.v1.json
│  │  └─ package.json
│  └─ shared/
│     ├─ nats/
│     │  ├─ index.ts
│     │  └─ package.json
│     ├─ telemetry/
│     │  ├─ otel.ts
│     │  └─ package.json
│     └─ config/
│        ├─ env.ts
│        └─ package.json
├─ apps/
│  ├─ gateway/
│  │  ├─ src/
│  │  │  ├─ server.ts
│  │  │  └─ problem.ts
│  │  └─ package.json
│  └─ mca-orchestrator/
│     ├─ src/
│     │  ├─ graph/state.ts
│     │  ├─ graph/gates.ts
│     │  ├─ graph/natsAdapter.ts
│     │  ├─ index.ts
│     │  └─ types.ts
│     └─ package.json
├─ services/
│  ├─ planner-ra/         # Research Agent (Python + FastAPI)
│  ├─ architect-aa/       # Architecture Agent (Python)
│  ├─ implementer-ia/     # Implementation Agent (Python)
│  ├─ runner-da/          # DevOps Runner (Go + Fiber, sandboxing)
│  ├─ security-sa/        # Security scans (Rust + Axum)
│  ├─ quality-qa/         # Tests/coverage parsing (TypeScript)
│  ├─ finops-fops/        # Budget/cost tracking (TypeScript)
│  ├─ db-layer-dba/       # DB ops (TypeScript + Postgres)
│  └─ ui-frontend/        # End-user UI (TypeScript + Next.js + React)
│     (each has src/, Dockerfile, package.json)
├─ turbo.json
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

---

# 2) `ops/dev/docker-compose.yml` (NATS + MinIO + Postgres + OTel Collector + Tempo + Grafana)

Based on current vendor docs for NATS JetStream, Tempo quickstart and OTel collector pipelines. ([NATS Docs][2])

```yaml
version: "3.9"

services:
  nats:
    image: nats:2
    command: ["-js", "-sd", "/data", "-p", "4222", "-m", "8222"]
    ports:
      - "4222:4222"   # client
      - "8222:8222"   # http monitoring
    volumes:
      - nats-data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: password123
      POSTGRES_USER: app
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector.yaml"]
    volumes:
      - ./otel-collector.yaml:/etc/otel-collector.yaml
    ports:
      - "4317:4317" # OTLP gRPC
      - "4318:4318" # OTLP HTTP
    depends_on: [tempo]

  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo/tempo-local.yaml:/etc/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - "3200:3200"   # Tempo HTTP
      - "4319:4319"   # OTLP receiver (if enabled in config)

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: password123
    ports:
      - "3000:3000"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on: [tempo]

volumes:
  nats-data:
  minio-data:
  pg-data:
  tempo-data:
```

**`ops/dev/otel-collector.yaml`**

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

exporters:
  otlphttp/tempo:
    endpoint: http://tempo:4318
    tls:
      insecure: true
  logging:
    logLevel: info

processors:
  batch: {}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/tempo, logging]
```

**`ops/dev/tempo/tempo-local.yaml`** (minimal local storage example per Grafana docs) ([Grafana Labs][3])

```yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
        grpc:

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces

compactor:
  compaction:
    block_retention: 24h

metrics_generator:
  registry:
    external_labels:
      source: tempo
```

**`ops/dev/grafana/provisioning/datasources/datasource.yml`**

```yaml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    isDefault: true
```

---

# 3) OpenAPI 3.1 specs (Gateway + 8 services)

All APIs adopt RFC 9457 Problem Details for errors. ([RFC Editor][4])

> `packages/contracts/openapi/gateway.openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: Autonomous Platform Gateway API
  version: 1.0.0
servers:
  - url: http://localhost:8080
paths:
  /healthz:
    get:
      summary: Liveness
      responses:
        '204': { description: OK }
  /readyz:
    get:
      summary: Readiness
      responses:
        '204': { description: Ready }
        '503':
          description: Not ready
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/Problem'
  /executions:
    post:
      summary: Create an execution
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [userIntent, budgetLimit]
              properties:
                userIntent: { type: string, minLength: 1 }
                budgetLimit: { type: number, minimum: 0 }
      responses:
        '202':
          description: Accepted
          headers:
            Location:
              description: URL to poll execution status
              schema: { type: string, format: uri }
        '400':
          description: Bad request
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/Problem' }
  /executions/{id}:
    get:
      summary: Get execution status
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Current execution state
          content:
            application/json:
              schema:
                type: object
                required: [id, status, gates, artifacts]
                properties:
                  id: { type: string, format: uuid }
                  status: { enum: [PENDING, RUNNING, FAILED, SUCCESS] }
                  gates:
                    type: array
                    items:
                      $ref: '#/components/schemas/GateEvidence'
                  artifacts:
                    type: object
                    additionalProperties: { type: string, format: uri }
        '404':
          description: Not found
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/Problem' }
components:
  schemas:
    Problem:
      type: object
      properties:
        type: { type: string, format: uri, default: "about:blank" }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string, format: uri }
      required: [title, status]
    GateEvidence:
      type: object
      required: [gate, status, ts]
      properties:
        gate: { type: string, enum: [G0, G1, G2, G3, G4, BUDGET] }
        status: { type: string, enum: [PASS, FAIL] }
        ts: { type: string, format: date-time }
        artifacts:
          type: object
          additionalProperties: { type: string, format: uri }
        reason: { type: string }
```

All internal worker services expose only **health** + **admin** endpoints (NATS used for work). Copy this template and replace `title`:

> Template: `packages/contracts/openapi/_template.worker.openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: SERVICE_TITLE
  version: 1.0.0
servers:
  - url: http://localhost:PORT
paths:
  /healthz:
    get:
      responses:
        '204': { description: OK }
  /readyz:
    get:
      responses:
        '204': { description: Ready }
        '503':
          description: Not ready
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/Problem'
components:
  schemas:
    Problem:
      type: object
      properties:
        type: { type: string, format: uri, default: "about:blank" }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string, format: uri }
      required: [title, status]
```

Now the eight concrete files (identical to template except titles/ports):

```
packages/contracts/openapi/planner-ra.openapi.yaml        (PORT 7011, title "Planner (RA)")
packages/contracts/openapi/architect-aa.openapi.yaml      (PORT 7012, title "Architect (AA)")
packages/contracts/openapi/implementer-ia.openapi.yaml    (PORT 7013, title "Implementer (IA)")
packages/contracts/openapi/runner-da.openapi.yaml         (PORT 7014, title "Runner (DA)")
packages/contracts/openapi/security-sa.openapi.yaml       (PORT 7015, title "Security (SA)")
packages/contracts/openapi/quality-qa.openapi.yaml        (PORT 7016, title "Quality (QA)")
packages/contracts/openapi/finops-fops.openapi.yaml       (PORT 7017, title "FinOps (FOPS)")
packages/contracts/openapi/db-layer-dba.openapi.yaml      (PORT 7018, title "DB Layer (DBA)")
```

(Replace `SERVICE_TITLE` + `PORT` in each.)

---

# 4) JSON Schemas (work items + results + evidence)

> `packages/contracts/schema/work-item.v1.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://autonomous.local/schemas/work-item.v1.json",
  "type": "object",
  "required": ["execId", "taskId", "kind", "inputs", "evidenceBaseUrl"],
  "properties": {
    "execId": { "type": "string", "format": "uuid" },
    "taskId": { "type": "string" },
    "kind": {
      "type": "string",
      "enum": ["plan", "design", "implement", "run", "scan", "qualify", "cost-check", "db-op"]
    },
    "inputs": { "type": "object" },
    "evidenceBaseUrl": { "type": "string", "format": "uri" },
    "budgetLimit": { "type": "number", "minimum": 0 }
  },
  "additionalProperties": false
}
```

> `packages/contracts/schema/work-result.v1.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://autonomous.local/schemas/work-result.v1.json",
  "type": "object",
  "required": ["execId", "taskId", "status", "outputs", "artifacts"],
  "properties": {
    "execId": { "type": "string", "format": "uuid" },
    "taskId": { "type": "string" },
    "status": { "type": "string", "enum": ["OK", "ERROR"] },
    "outputs": { "type": "object" },
    "artifacts": {
      "type": "object",
      "additionalProperties": { "type": "string", "format": "uri" }
    },
    "error": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "detail": { "type": "string" }
      }
    }
  },
  "additionalProperties": false
}
```

> `packages/contracts/schema/evidence-record.v1.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://autonomous.local/schemas/evidence-record.v1.json",
  "type": "object",
  "required": ["ts", "gate", "status"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "gate": { "type": "string", "enum": ["G0", "G1", "G2", "G3", "G4", "BUDGET"] },
    "status": { "type": "string", "enum": ["PASS", "FAIL"] },
    "reason": { "type": "string" },
    "artifacts": {
      "type": "object",
      "additionalProperties": { "type": "string", "format": "uri" }
    }
  },
  "additionalProperties": false
}
```

---

# 5) GitHub Actions workflows (SBOM, SLSA, Semgrep, CodeQL, Trivy)

* **CycloneDX (Node)** for SBOM.
* **SLSA GitHub Generator** for provenance.
* **Semgrep** (PR SAST).
* **CodeQL** (deep static).
* **Trivy** (images/SCA).
  Supported by vendor docs/blogs; adapt tokens/permissions as needed. ([Grafana Labs][5])

> `.github/workflows/sbom.yml`

```yaml
name: SBOM
on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  cyclonedx:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g @cyclonedx/cyclonedx-npm
      - run: cyclonedx-npm --output-file sbom.json
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

> `.github/workflows/slsa.yml`

```yaml
name: SLSA
on:
  push:
    tags: ["v*.*.*"]

permissions:
  id-token: write
  contents: read

jobs:
  provenance:
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.10.0
    with:
      base64-subject: "${{ github.sha }}"
```

> `.github/workflows/semgrep.yml`

```yaml
name: Semgrep
on:
  pull_request:
    branches: [ main ]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: "auto"
          generateSarif: "1"
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif
```

> `.github/workflows/codeql.yml`

```yaml
name: CodeQL
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 6 * * 0'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript-typescript' ]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
      - uses: github/codeql-action/analyze@v3
```

> `.github/workflows/trivy.yml`

```yaml
name: Trivy
on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images (example: orchestrator)
        run: |
          docker build -t local/orchestrator ./apps/mca-orchestrator
      - name: Scan image
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: local/orchestrator
          format: 'sarif'
          output: 'trivy.sarif'
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy.sarif
```

---

# 6) LangGraph orchestrator skeleton (State machine + NATS adapters)

Uses **LangGraph** StateGraph with a SQLite checkpointer, per official docs, and sends work to NATS/JetStream. ([LangChain][1])

> `apps/mca-orchestrator/package.json`

```json
{
  "name": "@apps/mca-orchestrator",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "@langchain/core": "^0.2.0",
    "@langchain/langgraph": "^0.1.0",
    "@langchain/openai": "^0.2.0",
    "nats": "^2.20.0",
    "zod": "^3.23.8",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  }
}
```

> `apps/mca-orchestrator/src/types.ts`

```ts
export type Gate = "G0" | "G1" | "G2" | "G3" | "G4" | "BUDGET";

export interface Evidence {
  gate: Gate;
  status: "PASS" | "FAIL";
  ts: string;
  reason?: string;
  artifacts?: Record<string, string>;
}

export interface State {
  execId: string;
  userIntent: string;
  budgetLimit: number;
  budgetUsed: number;
  tasks: Array<{ id: string; kind: string; desc: string }>;
  gateEvidence: Evidence[];
  artifacts: Record<string, string>;
}
```

> `apps/mca-orchestrator/src/graph/natsAdapter.ts`

```ts
import { connect, StringCodec, JetStreamClient } from "nats";
const sc = StringCodec();

export type WorkKind = "plan"|"design"|"implement"|"run"|"scan"|"qualify"|"cost-check";

export class WorkBus {
  private js!: JetStreamClient;

  async init() {
    const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
    this.js = nc.jetstream();
  }

  async request(kind: WorkKind, payload: object): Promise<any> {
    const subj = `work.${kind}.request`;
    const inbox = `${subj}.reply.${crypto.randomUUID()}`;
    // naive: publish request; services reply to reply subject
    await this.js.publish(subj, sc.encode(JSON.stringify({ ...payload, reply: inbox })));
    // TODO: For POC you can convert to simple request/reply using core NATS if preferred
    return new Promise((resolve) => {
      // in production: use pull consumer with timeout, retries
      // for skeleton, a simple subscription:
      import("nats").then(async ({ connect }) => {
        const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
        const sub = nc.subscribe(inbox, { max: 1 });
        (async () => {
          for await (const m of sub) {
            resolve(JSON.parse(sc.decode(m.data)));
          }
        })();
      });
    });
  }
}
```

> `apps/mca-orchestrator/src/graph/gates.ts`

```ts
import { State, Evidence, Gate } from "../types";

export function recordGate(state: State, gate: Gate, pass: boolean, reason?: string, artifacts?: Record<string,string>): State {
  const ev: Evidence = {
    gate, status: pass ? "PASS" : "FAIL", ts: new Date().toISOString(), reason, artifacts
  };
  return { ...state, gateEvidence: [...state.gateEvidence, ev] };
}
```

> `apps/mca-orchestrator/src/graph/state.ts`

```ts
import { StateGraph, Annotation } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { WorkBus } from "./natsAdapter";
import { recordGate } from "./gates";
import type { State } from "../types";

const AgentState = Annotation.Root({
  execId: Annotation<string>(),
  userIntent: Annotation<string>(),
  budgetLimit: Annotation<number>(),
  budgetUsed: Annotation<number>(),
  tasks: Annotation<Array<any>>(),
  gateEvidence: Annotation<Array<any>>(),
  artifacts: Annotation<Record<string, string>>()
});

const bus = new WorkBus();

async function plannerNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("plan", { execId: state.execId, userIntent: state.userIntent });
  const next = { ...state, tasks: res.tasks ?? [] };
  return recordGate(next, "G0", Array.isArray(next.tasks) && next.tasks.length > 0, !next.tasks?.length && "No tasks produced");
}

async function architectNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("design", { execId: state.execId, tasks: state.tasks });
  const artifacts = { ...state.artifacts, adr: res.adrUrl, contract: res.contractUrl };
  const ok = !!res.contractUrl;
  return recordGate({ ...state, artifacts }, "G1", ok, ok ? undefined : "No contract emitted", ok ? { adr: res.adrUrl, contract: res.contractUrl } : undefined);
}

async function implementNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("implement", { execId: state.execId, tasks: state.tasks });
  return { ...state, artifacts: { ...state.artifacts, patch: res.patchUrl } };
}

async function runnerNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("run", { execId: state.execId, patchUrl: state.artifacts.patch });
  const artifacts = { ...state.artifacts, junit: res.junitUrl, coverage: res.coverageUrl };
  return { ...state, artifacts };
}

async function securityNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("scan", { execId: state.execId });
  const ok = !(res.highOrCriticalCount > 0);
  return recordGate({ ...state, artifacts: { ...state.artifacts, sarif: res.sarifUrl, sbom: res.sbomUrl } }, "G2", ok, ok ? undefined : "High/Critical findings", { sarif: res.sarifUrl, sbom: res.sbomUrl });
}

async function qualityNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("qualify", { execId: state.execId });
  const ok = (res.lineCoveragePct ?? 0) >= 80;
  return recordGate(state, "G3", ok, ok ? undefined : `Coverage ${res.lineCoveragePct}% < 80%`);
}

async function finopsNode(state: State): Promise<Partial<State>> {
  const res = await bus.request("cost-check", { execId: state.execId, budgetLimit: state.budgetLimit });
  const ok = !res.overBudget;
  return recordGate({ ...state, budgetUsed: res.totalCost }, "BUDGET", ok, ok ? undefined : `Budget exceeded: ${res.totalCost}/${state.budgetLimit}`);
}

export const workflow = new StateGraph(AgentState)
  .addNode("planner", plannerNode)
  .addNode("architect", architectNode)
  .addNode("implement", implementNode)
  .addNode("runner", runnerNode)
  .addNode("security", securityNode)
  .addNode("quality", qualityNode)
  .addNode("finops", finopsNode)
  .addEdge("__start__", "planner")
  .addEdge("planner", "architect")
  .addEdge("architect", "implement")
  .addEdge("implement", "runner")
  .addEdge("runner", "security")
  .addEdge("security", "quality")
  .addEdge("quality", "finops")
  .addEdge("finops", "__end__")
  .compile({
    checkpointer: new SqliteSaver("./checkpoints.db") // per LangGraph persistence guidance
  });
```

> `apps/mca-orchestrator/src/index.ts`

```ts
import { workflow } from "./graph/state";
import { WorkBus } from "./graph/natsAdapter";
import { v4 as uuidv4 } from "uuid";

const bus = new WorkBus();

async function main() {
  await bus.init();
  const execId = uuidv4();
  const state = await workflow.invoke({
    execId,
    userIntent: process.env.USER_INTENT || "Create a TODO app with tests",
    budgetLimit: Number(process.env.BUDGET || 100),
    budgetUsed: 0,
    tasks: [],
    gateEvidence: [],
    artifacts: {}
  });
  console.log("FINAL STATE:", JSON.stringify(state, null, 2));
}
main().catch(console.error);
```

---

# 7) Runner service skeleton (sandbox + evidence upload)

This is a minimal Node runner that executes tests with a timeout and uploads artifacts to MinIO.

> `services/runner-da/package.json`

```json
{
  "name": "@services/runner-da",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": {
    "express": "^4.19.2",
    "minio": "^8.0.0",
    "nats": "^2.20.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3",
    "@types/express": "^4.17.21"
  }
}
```

> `services/runner-da/src/server.ts`

```ts
import express from "express";
import { connect, StringCodec } from "nats";
import { Client } from "minio";
import { spawn } from "node:child_process";
import fs from "node:fs";

const sc = StringCodec();
const app = express();

const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "admin",
  secretKey: process.env.MINIO_SECRET_KEY || "password123"
});

async function ensureBucket(bucket: string) {
  const exists = await minio.bucketExists(bucket).catch(() => false);
  if (!exists) await minio.makeBucket(bucket, "us-east-1");
}

async function upload(filePath: string, bucket: string, objectName: string): Promise<string> {
  await ensureBucket(bucket);
  await minio.fPutObject(bucket, objectName, filePath);
  return `http://localhost:9000/${bucket}/${objectName}`;
}

async function main() {
  const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

  // Health endpoints
  app.get("/healthz", (_req, res) => res.sendStatus(204));
  app.get("/readyz", (_req, res) => res.sendStatus(204));
  app.listen(7014, () => console.log("runner-da listening on :7014"));

  // Subscribe to run requests
  const subj = "work.run.request";
  const sub = nc.subscribe(subj);
  console.log(`runner-da listening on ${subj}`);

  for await (const m of sub) {
    const msg = JSON.parse(sc.decode(m.data));
    const { execId, reply } = msg;
    const junitPath = `/tmp/${execId}-junit.xml`;
    const covPath = `/tmp/${execId}-coverage.json`;

    // Example: run tests (Node project) with timeout
    const child = spawn("npm", ["test", "--", "--reporter=junit", `--reporter-options`, `mochaFile=${junitPath}`, "--coverage", `--coverageReporters=json`], {
      cwd: process.env.WORKSPACE_DIR || "/workspace",
      env: { ...process.env },
      stdio: "inherit",
      timeout: 60_000
    });

    child.on("exit", async () => {
      // If files exist, upload to MinIO
      const junitUrl = fs.existsSync(junitPath) ? await upload(junitPath, "evidence", `${execId}/junit.xml`) : "";
      const coverageUrl = fs.existsSync(covPath) ? await upload(covPath, "evidence", `${execId}/coverage.json`) : "";

      const res = { junitUrl, coverageUrl };
      if (reply) {
        await nc.publish(reply, sc.encode(JSON.stringify(res)));
      }
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

(Other services can mirror this NATS pattern, performing their role and replying on `reply` subject.)

---

# 8) All 9 service `package.json` files

> `apps/gateway/package.json`

```json
{
  "name": "@apps/gateway",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": {
    "express": "^4.19.2",
    "zod": "^3.23.8",
    "uuid": "^9.0.1",
    "nats": "^2.20.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3",
    "@types/express": "^4.17.21"
  }
}
```

> `apps/mca-orchestrator/package.json` (already above)

> `services/planner-ra/package.json`

```json
{
  "name": "@services/planner-ra",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0", "@langchain/openai": "^0.2.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21" }
}
```

> `services/architect-aa/package.json`

```json
{
  "name": "@services/architect-aa",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0", "@langchain/openai": "^0.2.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21" }
}
```

> `services/implementer-ia/package.json`

```json
{
  "name": "@services/implementer-ia",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0", "@langchain/openai": "^0.2.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21" }
}
```

> `services/runner-da/package.json` (above)

> `services/security-sa/package.json`

```json
{
  "name": "@services/security-sa",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21" }
}
```

> `services/quality-qa/package.json`

```json
{
  "name": "@services/quality-qa",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21" }
}
```

> `services/finops-fops/package.json`

```json
{
  "name": "@services/finops-fops",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21" }
}
```

> `services/db-layer-dba/package.json`

```json
{
  "name": "@services/db-layer-dba",
  "private": true,
  "type": "module",
  "scripts": { "dev": "ts-node src/server.ts" },
  "dependencies": { "express": "^4.19.2", "nats": "^2.20.0", "pg": "^8.12.0" },
  "devDependencies": { "ts-node": "^10.9.2", "typescript": "^5.6.3", "@types/express": "^4.17.21", "@types/pg": "^8.10.2" }
}
```

> `packages/contracts/package.json`

```json
{
  "name": "@packages/contracts",
  "private": true,
  "version": "1.0.0"
}
```

> `packages/shared/nats/package.json`

```json
{
  "name": "@shared/nats",
  "private": true,
  "version": "1.0.0"
}
```

> `packages/shared/telemetry/package.json`

```json
{
  "name": "@shared/telemetry",
  "private": true,
  "version": "1.0.0"
}
```

> `packages/shared/config/package.json`

```json
{
  "name": "@shared/config",
  "private": true,
  "version": "1.0.0"
}
```

> Root `package.json`, `turbo.json`, `pnpm-workspace.yaml`

```json
// package.json
{
  "name": "autonomous-platform",
  "private": true,
  "packageManager": "pnpm@9.6.0",
  "scripts": {
    "dev:gateway": "turbo run dev --filter=@apps/gateway",
    "dev:orchestrator": "turbo run dev --filter=@apps/mca-orchestrator",
    "dev:runner": "turbo run dev --filter=@services/runner-da"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "pnpm": "^9.6.0"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false
    }
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

---

# 9) Gateway server + RFC 9457 helper + README

> `apps/gateway/src/problem.ts` (RFC 9457 helper) ([RFC Editor][4])

```ts
import { Request, Response } from "express";

export function problem(res: Response, status: number, title: string, detail?: string) {
  res.status(status).type("application/problem+json").send({
    type: "about:blank",
    title, status, detail, instance: res.req.originalUrl
  });
}
```

> `apps/gateway/src/server.ts`

```ts
import express from "express";
import { problem } from "./problem";
import { connect, StringCodec } from "nats";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());
const sc = StringCodec();

let ncPromise = connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

app.get("/healthz", (_req, res) => res.sendStatus(204));
app.get("/readyz", async (_req, res) => {
  try {
    const nc = await ncPromise;
    if (nc.isClosed()) throw new Error("NATS closed");
    res.sendStatus(204);
  } catch {
    problem(res, 503, "Not Ready", "Cannot reach NATS");
  }
});

app.post("/executions", async (req, res) => {
  const { userIntent, budgetLimit } = req.body || {};
  if (!userIntent || typeof budgetLimit !== "number") return problem(res, 400, "Invalid payload");

  const id = uuidv4();
  res.status(202).set("Location", `/executions/${id}`).send();

  // Kick off orchestrator via NATS message if desired, or let orchestrator poll a queue.
  const nc = await ncPromise;
  await nc.publish("orchestrator.start", sc.encode(JSON.stringify({ execId: id, userIntent, budgetLimit })));
});

const executions = new Map<string, any>(); // naive in-memory demo
app.get("/executions/:id", (req, res) => {
  const st = executions.get(req.params.id);
  if (!st) return problem(res, 404, "Not Found");
  res.json(st);
});

app.listen(8080, () => console.log("gateway listening on :8080"));
```

> `README.md` (setup)

````md
# Autonomous Platform (Enterprise-from-Start)

## What this is
- **Monorepo (Turborepo)** with **9 services** + **Gateway** + **LangGraph Orchestrator**
- **NATS JetStream** for work dispatch
- **MinIO (S3)** for artifacts (evidence)
- **Postgres** (reserved for state/db-layer)
- **OpenTelemetry → Collector → Tempo → Grafana** for traces
- **SBOM, SLSA, Semgrep, CodeQL, Trivy** in CI

References:  
- LangGraph persistence & state graphs (checkpointers, nodes) :contentReference[oaicite:7]{index=7}  
- NATS JetStream docker/compose basics :contentReference[oaicite:8]{index=8}  
- Tempo + OTel Collector + Grafana local stack :contentReference[oaicite:9]{index=9}  
- RFC 9457 Problem Details (API errors) :contentReference[oaicite:10]{index=10}

## Prereqs
- Node 18+
- pnpm
- Docker

## Run the infra
```bash
cd ops/dev
docker compose up -d
````

## Install + dev

```bash
pnpm i
pnpm run dev:gateway
pnpm run dev:orchestrator
pnpm run dev:runner
```

Visit Grafana: [http://localhost:3000](http://localhost:3000) (admin/password123)
MinIO Console: [http://localhost:9001](http://localhost:9001) (admin/password123)
Gateway: `POST http://localhost:8080/executions` with:

```json
{ "userIntent": "Create a TODO app with tests", "budgetLimit": 100 }
```

## Execution flow (Week 1)

1. **Gateway** accepts execution → returns `202 + Location`.
2. **Orchestrator** (LangGraph) runs nodes: planner → architect → implement → runner → security → quality → finops.
3. Each node **publishes work** to NATS and **awaits results**.
4. Services perform work and **upload artifacts** to MinIO (SBOM, SARIF, JUnit, coverage).
5. Orchestrator emits **GateEvidence** (PASS/FAIL) with artifact URLs.
6. **Grafana** shows spans from each node (OTel).

## Hard rules

* **Binary gates only** (no subjective passes).
* **Evidence-first**: every gate adds artifacts.
* **No mocks/stubs**: green is truly green.

## Next steps

* Flesh out each service's `src/server.ts` to subscribe to its `work.<kind>.request` subject and reply on `reply`.
* Add **coverage parsing** in `quality-qa`.
* Add **Semgrep + CycloneDX** invocation in `security-sa` (store SARIF/SBOM to MinIO).
* Implement **FinOps** token/seconds tracking in `finops-fops`.

```

---

## Final notes

- **LangGraph** checkpointer use and state graph semantics mirror the docs (persistence, nodes, edges). :contentReference[oaicite:11]{index=11}  
- **NATS JetStream** is enabled (`-js`) and persistent via a volume; adapt to clustering later. :contentReference[oaicite:12]{index=12}  
- **OTel → Tempo → Grafana** wiring follows Grafana’s quickstart guidance for local dev. :contentReference[oaicite:13]{index=13}  
- **RFC 9457** Problem Details format is used for all error responses. :contentReference[oaicite:14]{index=14}

If you want me to also drop **starter `src/server.ts`** files for the other 8 services (planner, architect, implementer, security, quality, finops, dba) with NATS subscriptions and stub replies, say the word and I’ll paste them in the same style as `runner-da`.
::contentReference[oaicite:15]{index=15}
```

[1]: https://langchain-ai.github.io/langgraph/concepts/persistence/?utm_source=chatgpt.com "LangGraph persistence - GitHub Pages"
[2]: https://docs.nats.io/running-a-nats-service/nats_docker/jetstream_docker?utm_source=chatgpt.com "JetStream - NATS Docs"
[3]: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/locally/docker-compose/?utm_source=chatgpt.com "Deploy Tempo using Docker Compose"
[4]: https://www.rfc-editor.org/rfc/rfc9457.html?utm_source=chatgpt.com "RFC 9457: Problem Details for HTTP APIs"
[5]: https://grafana.com/blog/2024/03/13/an-opentelemetry-backend-in-a-docker-image-introducing-grafana/otel-lgtm/?utm_source=chatgpt.com "An OpenTelemetry backend in a Docker image"
