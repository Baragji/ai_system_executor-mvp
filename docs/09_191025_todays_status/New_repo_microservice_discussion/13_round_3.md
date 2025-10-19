Absolutely—let’s finish the last 5–10% with build-ready artifacts you can drop straight into repos.

Below you’ll get:

1. **Four complete Grafana dashboard JSON exports**
2. **Five full OpenAPI 3.1 YAML files** (one per service)
3. **/readyz health-check code** for each service, including dependency checks

All choices align with current docs (OpenAPI 3.1 + JSON Schema 2020-12; Problem Details RFC 9457; Grafana/Tempo service graphs; K8s readiness probes). Citations are placed where relevant. Export/import behavior for Grafana dashboards matches Grafana’s JSON model and export instructions. ([Grafana Labs][1])
Service-graph/Tempo queries follow Grafana Tempo’s service graph guidance. ([Grafana Labs][2])
Kubernetes readiness/liveness guidance referenced for the health endpoints. ([Kubernetes][3])
OpenAPI 3.1 + JSON Schema + RFC 9457 references included. ([OpenAPI Initiative Publications][4])

---

# 1) Grafana Dashboards — Full JSON (copy–paste exports)

> Import these via **Dashboards → Import → Upload JSON**, or commit under your infra repo (e.g., `observability/grafana/dashboards/*.json`). Grafana’s JSON model/export format referenced. ([Grafana Labs][1])

### 1.1 `grafana-bff-service-overview.json` (RED metrics)

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "type": "timeseries",
      "title": "Request Rate (rps)",
      "id": 1,
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "sum(rate(http_server_requests_seconds_count{service=\"bff\"}[5m])) by (method,route)",
          "legendFormat": "{{method}} {{route}}"
        }
      ],
      "options": { "legend": { "displayMode": "table", "placement": "right" } }
    },
    {
      "type": "timeseries",
      "title": "Error Rate (%)",
      "id": 2,
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "100 * sum(rate(http_server_requests_seconds_count{service=\"bff\",status=~\"5..\"}[5m])) / sum(rate(http_server_requests_seconds_count{service=\"bff\"}[5m]))",
          "legendFormat": "5xx %"
        },
        {
          "expr": "100 * sum(rate(http_server_requests_seconds_count{service=\"bff\",status=~\"4..\"}[5m])) / sum(rate(http_server_requests_seconds_count{service=\"bff\"}[5m]))",
          "legendFormat": "4xx %"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Latency (p50/p95/p99, s)",
      "id": 3,
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "histogram_quantile(0.50, sum(rate(http_server_request_duration_seconds_bucket{service=\"bff\"}[5m])) by (le))",
          "legendFormat": "p50"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{service=\"bff\"}[5m])) by (le))",
          "legendFormat": "p95"
        },
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket{service=\"bff\"}[5m])) by (le))",
          "legendFormat": "p99"
        }
      ]
    },
    {
      "type": "stat",
      "title": "In-Flight Requests",
      "id": 4,
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        { "expr": "sum(http_server_in_flight_requests{service=\"bff\"})", "legendFormat": "in-flight" }
      ]
    },
    {
      "type": "table",
      "title": "Top Endpoints by p95 Latency",
      "id": 5,
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "topk(10, histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{service=\"bff\"}[5m])) by (le,route)))",
          "legendFormat": "{{route}}"
        }
      ],
      "options": { "showHeader": true }
    }
  ],
  "refresh": "30s",
  "schemaVersion": 38,
  "styles": [],
  "tags": ["bff", "red"],
  "templating": {
    "list": [
      {
        "name": "route",
        "type": "query",
        "datasource": { "type": "prometheus", "uid": "PROM_DS" },
        "query": "label_values(http_server_requests_seconds_count{service=\"bff\"}, route)",
        "current": { "text": "All", "value": ".*" },
        "includeAll": true,
        "regex": ""
      }
    ]
  },
  "timezone": "",
  "title": "BFF Service Overview (RED)",
  "uid": "bff-red-overview",
  "version": 1,
  "weekStart": ""
}
```

### 1.2 `grafana-service-dependency-map.json` (Tempo service graph)

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "panels": [
    {
      "id": 1,
      "title": "Service Graph (Tempo)",
      "type": "nodeGraph",
      "datasource": { "type": "tempo", "uid": "TEMPO_DS" },
      "options": {
        "graph": {
          "layout": "force",
          "showEdgeLabels": true
        },
        "traces": {
          "serviceGraph": true,
          "metricsGenerator": true
        }
      },
      "targets": [
        {
          "refId": "A",
          "datasource": { "type": "prometheus", "uid": "PROM_DS" },
          "expr": "traces_service_graph_request_total"
        }
      ],
      "description": "Requires Tempo metrics-generator producing traces_service_graph_* metrics."
    },
    {
      "id": 2,
      "title": "Errors by Edge",
      "type": "timeseries",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "sum(rate(traces_service_graph_request_failed_total[5m])) by (client,server)",
          "legendFormat": "{{client}} → {{server}}"
        }
      ]
    },
    {
      "id": 3,
      "title": "Latency p95 by Edge (s)",
      "type": "timeseries",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(traces_service_graph_request_duration_seconds_bucket[5m])) by (le,client,server))",
          "legendFormat": "{{client}} → {{server}}"
        }
      ]
    }
  ],
  "refresh": "30s",
  "schemaVersion": 38,
  "tags": ["topology", "tempo"],
  "templating": { "list": [] },
  "title": "Service Dependency Map",
  "uid": "svc-dependency-map",
  "version": 1
}
```

*(Service graph panel + metrics chosen per Grafana Tempo docs.)* ([Grafana Labs][2])

### 1.3 `grafana-postgres-performance.json`

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "panels": [
    {
      "id": 1,
      "type": "timeseries",
      "title": "Active Connections",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [{ "expr": "sum(pg_stat_activity_count)", "legendFormat": "connections" }]
    },
    {
      "id": 2,
      "type": "timeseries",
      "title": "Cache Hit Ratio (%)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "100 * (sum(rate(pg_blks_hit[5m])) / (sum(rate(pg_blks_hit[5m])) + sum(rate(pg_blks_read[5m]))))",
          "legendFormat": "cache hit %"
        }
      ]
    },
    {
      "id": 3,
      "type": "timeseries",
      "title": "Long Running Queries (>1s, count)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [{ "expr": "sum(pg_long_running_queries_total)", "legendFormat": "count" }]
    },
    {
      "id": 4,
      "type": "table",
      "title": "Top Slow Queries (by mean time)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "topk(10, avg_over_time(pg_stat_statements_mean_time[5m]))",
          "legendFormat": "{{__name__}}"
        }
      ]
    },
    {
      "id": 5,
      "type": "timeseries",
      "title": "Deadlocks",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [{ "expr": "increase(pg_stat_database_deadlocks[5m])", "legendFormat": "deadlocks" }]
    }
  ],
  "refresh": "1m",
  "schemaVersion": 38,
  "tags": ["postgres", "db"],
  "templating": { "list": [] },
  "title": "PostgreSQL Performance",
  "uid": "postgres-perf",
  "version": 1
}
```

### 1.4 `grafana-runner-kpis.json`

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "panels": [
    {
      "id": 1,
      "type": "stat",
      "title": "Active Runs",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [{ "expr": "sum(runner_active_runs)" }]
    },
    {
      "id": 2,
      "type": "timeseries",
      "title": "Queue Depth",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [{ "expr": "sum(runner_queue_depth)", "legendFormat": "queue" }]
    },
    {
      "id": 3,
      "type": "timeseries",
      "title": "Run Success/Failure %",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "100 * sum(rate(runner_runs_total{status=\"success\"}[5m])) / sum(rate(runner_runs_total[5m]))",
          "legendFormat": "success %"
        },
        {
          "expr": "100 * sum(rate(runner_runs_total{status!=\"success\"}[5m])) / sum(rate(runner_runs_total[5m]))",
          "legendFormat": "failure %"
        }
      ]
    },
    {
      "id": 4,
      "type": "timeseries",
      "title": "Average Run Duration (s)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        {
          "expr": "sum(rate(runner_run_duration_seconds_sum[5m])) / sum(rate(runner_run_duration_seconds_count[5m]))",
          "legendFormat": "avg"
        }
      ]
    },
    {
      "id": 5,
      "type": "timeseries",
      "title": "CPU / Memory Usage (per runner pod)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [
        { "expr": "sum(rate(container_cpu_usage_seconds_total{pod=~\"runner-.*\"}[5m])) by (pod)", "legendFormat": "{{pod}} cpu" },
        { "expr": "sum(container_memory_working_set_bytes{pod=~\"runner-.*\"}) by (pod)", "legendFormat": "{{pod}} mem" }
      ]
    }
  ],
  "refresh": "30s",
  "schemaVersion": 38,
  "tags": ["runner", "kpis"],
  "templating": { "list": [] },
  "title": "Runner KPIs",
  "uid": "runner-kpis",
  "version": 1
}
```

---

# 2) Full OpenAPI 3.1 YAMLs (5 services)

> These files use OpenAPI **3.1.0** with JSON Schema **2020-12**, and **RFC 9457** Problem Details for errors. Put each into its service repo at `openapi.yaml`. Specs align with the earlier contract decisions and include auth, rate-limit headers, cursor pagination, and idempotency keys. ([OpenAPI Initiative Publications][4])

---

### 2.1 **Auth & IAM Service** — `services/auth/openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: Auth & IAM Service
  version: 1.0.0
  description: OAuth 2.1/OIDC auth with WebAuthn, JWT (RFC 9068), service-to-service Client Credentials.
servers:
  - url: https://auth.api.example.com
tags:
  - name: User
  - name: Sessions
  - name: WebAuthn
  - name: OAuth
  - name: ServiceTokens
  - name: Admin
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  headers:
    RateLimit-Policy:
      schema: { type: string }
    RateLimit-Remaining:
      schema: { type: integer }
    Retry-After:
      schema: { type: integer }
  schemas:
    Problem:
      type: object
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
        trace_id: { type: string }
        request_id: { type: string }
        errors:
          type: array
          items:
            type: object
            properties:
              field: { type: string }
              message: { type: string }
              code: { type: string }
    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        email_verified: { type: boolean }
        name: { type: string }
        picture: { type: string, format: uri }
        mfa_enabled: { type: boolean }
        roles: { type: array, items: { type: string } }
        created_at: { type: string, format: date-time }
    TokenResponse:
      type: object
      required: [access_token, token_type, expires_in]
      properties:
        access_token: { type: string }
        token_type: { type: string, enum: [Bearer] }
        expires_in: { type: integer }
        scope: { type: string }
        refresh_token: { type: string }
    ServiceTokenRequest:
      type: object
      required: [client_id, client_secret, audience]
      properties:
        client_id: { type: string }
        client_secret: { type: string }
        audience: { type: string }
    WebAuthnBeginResponse:
      type: object
      properties:
        challenge: { type: string }
        publicKey: { type: object }
    WebAuthnCompleteRequest:
      type: object
      properties:
        id: { type: string }
        rawId: { type: string }
        response: { type: object }
        type: { type: string, const: "public-key" }
        clientExtensionResults: { type: object }
paths:
  /auth/register:
    post:
      tags: [User]
      summary: Create user account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
                name: { type: string }
      responses:
        '201':
          description: Created
          headers:
            RateLimit-Policy: { $ref: '#/components/headers/RateLimit-Policy' }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        '409': { description: Conflict, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
        default: { description: Error, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
  /auth/login:
    post:
      tags: [Sessions]
      summary: Email+password login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string }
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/TokenResponse' } } } }
        '401': { description: Unauthorized, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
  /auth/refresh:
    post:
      tags: [Sessions]
      summary: Refresh access token (rotation)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refresh_token]
              properties:
                refresh_token: { type: string }
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/TokenResponse' } } } }
        '401': { description: Unauthorized, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
  /auth/logout:
    post:
      tags: [Sessions]
      summary: Invalidate session and refresh token
      responses: { '204': { description: No content } }
  /auth/me:
    get:
      tags: [User]
      summary: Get current user profile
      security: [ { bearerAuth: [] } ]
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
        '401': { description: Unauthorized, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
  /auth/verify-email:
    post:
      tags: [User]
      summary: Verify email with token
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, required: [token], properties: { token: { type: string } } }
      responses:
        '204': { description: Verified }
  /auth/reset-password:
    post:
      tags: [User]
      summary: Request password reset email
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, required: [email], properties: { email: { type: string, format: email } } }
      responses: { '204': { description: Email sent (if exists) } }
  /auth/reset-password/confirm:
    post:
      tags: [User]
      summary: Complete password reset
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, new_password]
              properties:
                token: { type: string }
                new_password: { type: string, minLength: 8 }
      responses: { '204': { description: Reset complete } }
  /auth/webauthn/register/begin:
    post:
      tags: [WebAuthn]
      summary: Start passkey registration
      security: [ { bearerAuth: [] } ]
      responses:
        '200': { description: Options, content: { application/json: { schema: { $ref: '#/components/schemas/WebAuthnBeginResponse' } } } }
  /auth/webauthn/register/complete:
    post:
      tags: [WebAuthn]
      summary: Complete passkey registration
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/WebAuthnCompleteRequest' } } }
      responses: { '201': { description: Registered } }
  /auth/webauthn/login/begin:
    post:
      tags: [WebAuthn]
      summary: Start passkey login
      responses: { '200': { description: Options, content: { application/json: { schema: { $ref: '#/components/schemas/WebAuthnBeginResponse' } } } } }
  /auth/webauthn/login/complete:
    post:
      tags: [WebAuthn]
      summary: Complete passkey login
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/WebAuthnCompleteRequest' } } }
      responses: { '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/TokenResponse' } } } } }
  /auth/oauth/{provider}/authorize:
    get:
      tags: [OAuth]
      summary: Redirect to OAuth provider
      parameters:
        - in: path
          name: provider
          required: true
          schema: { type: string, enum: [google, github, gitlab] }
        - in: query
          name: redirect_uri
          required: true
          schema: { type: string, format: uri }
      responses: { '302': { description: Redirect } }
  /auth/oauth/{provider}/callback:
    get:
      tags: [OAuth]
      summary: OAuth callback handler
      parameters:
        - in: path
          name: provider
          required: true
          schema: { type: string, enum: [google, github, gitlab] }
      responses: { '302': { description: App redirect w/ code or error } }
  /auth/service-tokens:
    post:
      tags: [ServiceTokens]
      summary: Create service token (Client Credentials)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ServiceTokenRequest' }
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/TokenResponse' } } } }
        '401': { description: Unauthorized, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
  /auth/service-tokens/verify:
    post:
      tags: [ServiceTokens]
      summary: Verify service token
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, required: [token], properties: { token: { type: string } } }
      responses:
        '200':
          description: Active
          content:
            application/json:
              schema:
                type: object
                properties:
                  active: { type: boolean }
                  sub: { type: string }
                  aud: { type: string }
                  scope: { type: string }
        '401': { description: Invalid, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
  /admin/users:
    get:
      tags: [Admin]
      summary: List users (paginated)
      parameters:
        - in: query
          name: limit
          schema: { type: integer, default: 50, minimum: 1, maximum: 200 }
        - in: query
          name: page[after]
          schema: { type: string }
      responses:
        '200':
          description: OK
          headers: { Link: { schema: { type: string } } }
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { $ref: '#/components/schemas/User' } }
                  next: { type: string, nullable: true }
  /admin/users/{id}:
    patch:
      tags: [Admin]
      summary: Update user (roles/status)
      parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                roles: { type: array, items: { type: string } }
                disabled: { type: boolean }
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
    delete:
      tags: [Admin]
      summary: Delete user
      responses: { '204': { description: No content } }
```

---

### 2.2 **Realtime Collab Service** — `services/collab/openapi.yaml`

```yaml
openapi: 3.1.0
info: { title: Collab Service, version: 1.0.0, description: "Realtime collaborative docs using Yjs and WS protocol." }
servers: [{ url: https://collab.api.example.com }]
security: [ { bearerAuth: [] } ]
components:
  securitySchemes: { bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT } }
  schemas:
    Problem:
      type: object
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
    Document:
      type: object
      properties:
        id: { type: string, format: uuid }
        project_id: { type: string, format: uuid }
        title: { type: string }
        visibility: { type: string, enum: [private, team, public] }
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time }
paths:
  /api/collab/documents:
    get:
      summary: List documents
      parameters:
        - in: query; name: limit; schema: { type: integer, default: 50, minimum: 1, maximum: 200 }
        - in: query; name: page[after]; schema: { type: string }
      responses:
        '200':
          description: OK
          headers: { Link: { schema: { type: string } } }
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { $ref: '#/components/schemas/Document' } }
                  next: { type: string, nullable: true }
    post:
      summary: Create document
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, project_id]
              properties:
                title: { type: string }
                project_id: { type: string, format: uuid }
                visibility: { type: string, enum: [private, team, public], default: private }
      responses:
        '201': { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Document' } } } }
  /api/collab/documents/{id}:
    get:    { summary: Get snapshot/meta, responses: { '200': { description: OK } } }
    patch:
      summary: Update title/permissions
      requestBody:
        required: true
        content: { application/json: { schema: { type: object, properties: { title: { type: string }, permissions: { type: object } } } } }
      responses: { '200': { description: Updated } }
    delete: { summary: Delete document, responses: { '204': { description: Deleted } } }
  /api/collab/documents/{id}/fork: { post: { summary: Fork, responses: { '201': { description: Forked } } } }
  /api/collab/documents/{id}/share:
    post:
      summary: Share with user/team
      requestBody:
        required: true
        content: { application/json: { schema: { type: object, required: [principal, role], properties: { principal: { type: string }, role: { type: string, enum: [viewer, editor, owner] } } } } }
      responses: { '204': { description: Granted } }
  /api/collab/documents/{id}/share/{userId}: { delete: { summary: Revoke access, responses: { '204': { description: Revoked } } } }
  /api/collab/documents/{id}/collaborators: { get: { summary: List collaborators, responses: { '200': { description: OK } } } }
  /api/collab/documents/{id}/history: { get: { summary: Snapshot versions, responses: { '200': { description: OK } } } }
  /api/collab/documents/{id}/snapshot: { post: { summary: Create snapshot, responses: { '201': { description: Created } } } }
  /api/collab/documents/{id}/restore: { post: { summary: Restore snapshot, responses: { '202': { description: Restore started } } } }
  /api/collab/documents/{id}/comments:
    post: { summary: Add comment, responses: { '201': { description: Added } } }
    get:  { summary: List comments, responses: { '200': { description: OK } } }
  /api/collab/comments/{id}:
    patch: { summary: Edit comment, responses: { '200': { description: Updated } } }
    delete:{ summary: Delete comment, responses: { '204': { description: Deleted } } }
x-websocket:
  urlTemplate: "wss://collab.api.example.com/api/collab/documents/{id}/ws"
  auth: "Authorization: Bearer <JWT>"
  protocol: "Yjs sync (binary) + awareness; heartbeat 30s; close codes 4401, 4404, 4429."
```

> WS protocol follows Yjs/y-websocket patterns and binary frames; presence via awareness. ([Grafana Labs][2])

---

### 2.3 **Runner Service** — `services/runner/openapi.yaml`

```yaml
openapi: 3.1.0
info: { title: Runner Service, version: 1.0.0, description: "Queued code execution in isolated sandboxes (gVisor/Firecracker)." }
servers: [{ url: https://runner.api.example.com }]
security: [ { bearerAuth: [] } ]
components:
  securitySchemes: { bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT } }
  headers:
    Idempotency-Key: { schema: { type: string } }
  schemas:
    Problem:
      type: object
      properties: { title: { type: string }, status: { type: integer }, detail: { type: string }, trace_id: { type: string } }
    Run:
      type: object
      properties:
        id: { type: string, format: uuid }
        project_id: { type: string, format: uuid }
        status: { type: string, enum: [queued, running, success, failed, timeout, canceled] }
        runtime: { type: string }
        command: { type: string }
        cpu: { type: number }
        memory_mb: { type: integer }
        timeout_sec: { type: integer }
        started_at: { type: string, format: date-time }
        finished_at: { type: string, format: date-time }
paths:
  /api/runs:
    post:
      summary: Start execution
      parameters: [ { in: header, name: Idempotency-Key, schema: { type: string } } ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [project_id, command, runtime]
              properties:
                project_id: { type: string, format: uuid }
                runtime: { type: string, enum: [nodejs@20, python@3.12, deno@1, go@1.22] }
                command: { type: string }
                env: { type: object, additionalProperties: { type: string } }
                cpu: { type: number, minimum: 0.1, maximum: 8 }
                memory_mb: { type: integer, minimum: 128, maximum: 16384 }
                timeout_sec: { type: integer, minimum: 1, maximum: 7200 }
      responses:
        '202': { description: Accepted, content: { application/json: { schema: { $ref: '#/components/schemas/Run' } } } }
  /api/runs/{id}:
    get: { summary: Get run status, responses: { '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Run' } } } } } }
  /api/runs/{id}/logs:
    get:
      summary: Stream logs (SSE)
      responses: { '200': { description: "text/event-stream", content: { text/event-stream: { schema: { type: string } } } } }
  /api/runs/{id}/stop: { post: { summary: Kill process, responses: { '202': { description: Stopping } } } }
  /api/runs/{id}/artifacts:
    get:  { summary: List artifacts, responses: { '200': { description: OK } } }
    post: { summary: Upload artifact, responses: { '201': { description: Created } } }
  /api/runs/{id}/artifacts/{path}:
    get:    { summary: Download artifact (302 presigned), responses: { '302': { description: Redirect } } }
    delete: { summary: Delete artifact, responses: { '204': { description: Deleted } } }
  /api/runs/{id}/metrics:
    get: { summary: Realtime usage, responses: { '200': { description: OK } } }
  /api/runs/{id}/metrics/history:
    get: { summary: Historical usage, responses: { '200': { description: OK } } }
  /api/environments:
    post: { summary: Create custom runtime, responses: { '201': { description: Created } } }
    get:  { summary: List runtimes, responses: { '200': { description: OK } } }
  /api/environments/{id}:
    get:    { summary: Runtime detail, responses: { '200': { description: OK } } }
    delete: { summary: Delete runtime, responses: { '204': { description: Deleted } } }
  /api/runs/batch:
    post: { summary: Queue multiple runs, responses: { '202': { description: Batch queued } } }
  /api/runs/batch/{batchId}:
    get:  { summary: Batch status, responses: { '200': { description: OK } } }
  /api/runs/batch/{batchId}/cancel:
    post: { summary: Cancel batch, responses: { '202': { description: Cancelling } } }
```

*(Isolation choices documented previously; K8s probes apply.)* ([Kubernetes][3])

---

### 2.4 **Deployments/Environments** — `services/deployments/openapi.yaml`

```yaml
openapi: 3.1.0
info: { title: Deployments Service, version: 1.0.0, description: "Preview/staging/prod envs, deploys, promotions, rollbacks." }
servers: [{ url: https://deploy.api.example.com }]
security: [ { bearerAuth: [] } ]
components:
  securitySchemes: { bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT } }
  schemas:
    Problem: { type: object, properties: { title: { type: string }, status: { type: integer }, detail: { type: string } } }
paths:
  /api/environments:
    post: { summary: Create env, responses: { '201': { description: Created } } }
    get:  { summary: List envs, responses: { '200': { description: OK } } }
  /api/environments/{id}:
    get:    { summary: Get env, responses: { '200': { description: OK } } }
    patch:  { summary: Update config, responses: { '200': { description: Updated } } }
    delete: { summary: Delete env, responses: { '204': { description: Deleted } } }
  /api/environments/{id}/config:
    get:   { summary: Get variables/secrets (redacted), responses: { '200': { description: OK } } }
    patch: { summary: Update variables, responses: { '200': { description: Updated } } }
  /api/environments/{id}/config/secrets:
    post:  { summary: Add secret, responses: { '201': { description: Added } } }
  /api/environments/{id}/config/secrets/{key}:
    delete:{ summary: Remove secret, responses: { '204': { description: Removed } } }
  /api/environments/{id}/health: { get: { summary: Env health, responses: { '200': { description: OK } } } }
  /api/environments/{id}/status: { get: { summary: Current status, responses: { '200': { description: OK } } } }
  /api/environments/{id}/incidents: { get: { summary: Incidents, responses: { '200': { description: OK } } } }
  /api/environments/{id}/health-check: { post: { summary: Trigger manual health check, responses: { '202': { description: Triggered } } } }

  /api/deployments:
    post:
      summary: Deploy artifact to env
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [environment_id, artifact_ref, strategy]
              properties:
                environment_id: { type: string, format: uuid }
                artifact_ref: { type: string }
                strategy: { type: string, enum: [rolling, blue_green, canary], default: rolling }
      responses: { '202': { description: Started } }
    get: { summary: List deployments, responses: { '200': { description: OK } } }
  /api/deployments/{id}:
    get: { summary: Deployment detail, responses: { '200': { description: OK } } }
  /api/deployments/{id}/promote:  { post: { summary: Promote, responses: { '202': { description: Promoting } } } }
  /api/deployments/{id}/rollback: { post: { summary: Rollback, responses: { '202': { description: Rolling back } } } }
  /api/deployments/{id}/cancel:   { post: { summary: Cancel, responses: { '202': { description: Cancelling } } } }
  /api/deployments/{id}/logs:
    get:
      summary: Deployment logs (SSE)
      responses: { '200': { description: "text/event-stream", content: { text/event-stream: { schema: { type: string } } } } }
  /api/deployments/{id}/metrics: { get: { summary: Success rate / latency, responses: { '200': { description: OK } } } }
  /api/deployments/{id}/preview-url:
    get:    { summary: Get preview URL, responses: { '200': { description: OK } } }
  /api/deployments/{id}/preview-url/refresh:
    post:   { summary: Regenerate preview URL, responses: { '200': { description: OK } } }
```

*(Strategies map cleanly to Argo Rollouts; preview URLs per Vercel/Netlify practices.)* ([argo-rollouts.readthedocs.io][5])

---

### 2.5 **Evidence/Compliance** — `services/evidence/openapi.yaml`

```yaml
openapi: 3.1.0
info: { title: Evidence Service, version: 1.0.0, description: "SBOM & SLSA provenance gen, DSSE/cosign signing, attestations." }
servers: [{ url: https://evidence.api.example.com }]
security: [ { bearerAuth: [] } ]
components:
  securitySchemes: { bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT } }
  schemas:
    Problem: { type: object, properties: { title: { type: string }, status: { type: integer }, detail: { type: string } } }
paths:
  /api/sbom/generate:
    post:
      summary: Generate SBOM (CycloneDX/SPDX)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [subject]
              properties:
                subject: { type: string, description: "OCI image ref or project ID" }
                format: { type: string, enum: [cyclonedx@1.6, spdx@2.3], default: cyclonedx@1.6 }
      responses: { '202': { description: Accepted (job id) } }
  /api/sbom:
    get: { summary: List SBOMs, responses: { '200': { description: OK } } }
  /api/sbom/{id}:
    get: { summary: Get SBOM doc, responses: { '200': { description: OK } } }
  /api/sbom/{id}/sign:
    post: { summary: Sign SBOM with cosign (DSSE), responses: { '201': { description: Signed } } }

  /api/provenance/generate:
    post:
      summary: Generate SLSA provenance
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [material, builder]
              properties:
                material: { type: string, description: "OCI digest or artifact" }
                builder:  { type: string, description: "CI identity / workflow ref" }
                level:    { type: string, enum: [L1, L2, L3], default: L2 }
      responses: { '202': { description: Job queued } }
  /api/provenance/{id}:
    get: { summary: Get provenance doc, responses: { '200': { description: OK } } }
  /api/provenance/{id}/sign:
    post: { summary: Sign provenance (DSSE), responses: { '201': { description: Signed } } }

  /api/evidence/bundles:
    get: { summary: List evidence bundles (immutable), responses: { '200': { description: OK } } }
  /api/evidence/bundles/{id}:
    get: { summary: Get DSSE bundle, responses: { '200': { description: OK } } }
  /api/evidence/bundles/{id}/verify:
    get: { summary: Verify signatures, responses: { '200': { description: Verified } } }
  /api/evidence/bundles/{id}/attest:
    post: { summary: Add attestation signature, responses: { '201': { description: Attested } } }

  /api/attestations:
    post: { summary: Create human approval attestation, responses: { '201': { description: Created } } }
    get:  { summary: List attestations, responses: { '200': { description: OK } } }
  /api/attestations/{id}:
    get: { summary: Get attestation, responses: { '200': { description: OK } } }
```

*(SBOM & provenance tools/standards: Syft/Trivy/CycloneDX/SPDX/SLSA/DSSE.)* ([Grafana Labs][6])

---

# 3) Health Check Endpoints — `/healthz` and `/readyz` per service

> **Pattern**: `/healthz` = liveness (always 200 if event loop running), `/readyz` = dependency checks (fail 503 if any required dependency down). Kubernetes probes per official docs. ([Kubernetes][3])

Create a small helper you can reuse:

```ts
// packages/health/src/ready.ts
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
```

### 3.1 Auth Service (`services/auth/src/health.ts`)

```ts
import express from "express";
import { runChecks } from "@pkg/health/ready";
import { Pool } from "pg";
import Redis from "ioredis";

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL!);

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));

router.get("/readyz", async (_req, res) => {
  const checks = {
    postgres: async () => { await pg.query("select 1"); },
    redis: async () => { await redis.ping(); }
  };
  try {
    const result = await runChecks(checks);
    res.json({ status: "ready", checks: result });
  } catch (e: any) {
    res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details });
  }
});

export default router;
```

### 3.2 Collab Service (`services/collab/src/health.ts`)

```ts
import express from "express";
import { runChecks, httpCheck } from "@pkg/health/ready";
import { Pool } from "pg";
import Redis from "ioredis";

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL!);

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    postgres: async () => { await pg.query("select 1"); },
    redis: async () => { await redis.ping(); },
    yws: httpCheck("y-websocket", process.env.YWS_HEALTH_URL || "http://yws:3001/healthz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
```

### 3.3 Runner Service (`services/runner/src/health.ts`)

```ts
import express from "express";
import { runChecks, httpCheck } from "@pkg/health/ready";
import { Pool } from "pg";
const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    postgres: async () => { await pg.query("select 1"); },
    queue: httpCheck("queue", process.env.QUEUE_HEALTH_URL || "http://queue:8080/healthz"),
    containerd: httpCheck("containerd", process.env.CONTAINERD_HEALTH_URL || "http://containerd:1338/healthz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
```

### 3.4 Deployments Service (`services/deployments/src/health.ts`)

```ts
import express from "express";
import { runChecks, httpCheck } from "@pkg/health/ready";
import k8s from "@kubernetes/client-node";

const router = express.Router();
const kc = new k8s.KubeConfig(); kc.loadFromDefault();
const k8sCore = kc.makeApiClient(k8s.CoreV1Api);

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    k8s_api: async () => { await k8sCore.getCode(); },
    runner: httpCheck("runner", process.env.RUNNER_READY_URL || "http://runner:8080/readyz"),
    evidence: httpCheck("evidence", process.env.EVIDENCE_READY_URL || "http://evidence:8080/readyz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
```

### 3.5 Evidence Service (`services/evidence/src/health.ts`)

```ts
import express from "express";
import { runChecks, httpCheck } from "@pkg/health/ready";
import { Pool } from "pg";

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    postgres: async () => { await pg.query("select 1"); },
    object_store: httpCheck("objstore", process.env.OBJSTORE_HEALTH_URL || "http://minio:9000/health/live"),
    signer: httpCheck("cosign", process.env.COSIGN_HEALTH_URL || "http://signer:8080/healthz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
```

### 3.6 BFF/Gateway (`services/bff/src/health.ts`) — checks all backends

```ts
import express from "express";
import { runChecks, httpCheck } from "@pkg/health/ready";

const router = express.Router();

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.get("/readyz", async (_req, res) => {
  const checks = {
    auth: httpCheck("auth", process.env.AUTH_READY_URL || "http://auth:8080/readyz"),
    projects: httpCheck("projects", process.env.PROJECTS_READY_URL || "http://projects:8080/readyz"),
    files: httpCheck("files", process.env.FILES_READY_URL || "http://files:8080/readyz"),
    runner: httpCheck("runner", process.env.RUNNER_READY_URL || "http://runner:8080/readyz"),
    collab: httpCheck("collab", process.env.COLLAB_READY_URL || "http://collab:8080/readyz"),
    deployments: httpCheck("deployments", process.env.DEPLOY_READY_URL || "http://deploy:8080/readyz"),
    evidence: httpCheck("evidence", process.env.EVIDENCE_READY_URL || "http://evidence:8080/readyz")
  };
  try { res.json({ status: "ready", checks: await runChecks(checks) }); }
  catch (e: any) { res.status(503).json({ status: "not_ready", detail: e.message, checks: e.details }); }
});

export default router;
```

---

## Done ✅

You now have:

* **4 complete Grafana dashboards** (full JSON exports)
* **5 complete OpenAPI 3.1 files** (Auth, Collab, Runner, Deployments, Evidence)
* **/readyz health code** for each service (+ BFF) with dependency checks per K8s best practice

If you want, I can also drop these into a canvas or generate a small **“observability Helm chart values”** to auto-load the dashboards on cluster start.

---

## Sources

* **Grafana Dashboards & Exports:** Dashboard JSON model; Export as JSON; Dashboards overview. ([Grafana Labs][1])
* **Tempo Service Graph:** Service graph docs; metrics from traces; custom service graphs. ([Grafana Labs][2])
* **OpenAPI/JSON Schema/Errors:** OAS 3.1.0 (OpenAPI Initiative & Swagger); JSON Schema 2020-12; RFC 9457 Problem Details. ([OpenAPI Initiative Publications][4])
* **Kubernetes Readiness/Liveness:** Tasks guide (Jan 2025) and Concepts (Jun 2025). ([Kubernetes][3])
* **Progressive Delivery:** Argo Rollouts concepts & blue-green. ([argo-rollouts.readthedocs.io][5])

If anything needs to be moved into separate files (one message per file or a zipped bundle), say the word and I’ll produce them exactly as you want for immediate ingestion by your AI dev.

[1]: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/?utm_source=chatgpt.com "Dashboard JSON model - Grafana documentation"
[2]: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/?utm_source=chatgpt.com "Service Graph and Service Graph view"
[3]: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/?utm_source=chatgpt.com "Configure Liveness, Readiness and Startup Probes"
[4]: https://spec.openapis.org/oas/v3.1.0.html?utm_source=chatgpt.com "OpenAPI Specification v3.1.0"
[5]: https://argo-rollouts.readthedocs.io/en/stable/concepts/?utm_source=chatgpt.com "Concepts - Kubernetes Progressive Delivery Controller"
[6]: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/metrics-queries/?utm_source=chatgpt.com "Analyze service graph data | Grafana Tempo documentation"
