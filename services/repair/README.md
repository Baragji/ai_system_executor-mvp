# Repair Service

The repair service is an Express + TypeScript scaffold with OpenTelemetry bootstrap and RFC 9457 problem details responses.

## Features

- Express server with JSON body parsing
- Health endpoint at `GET /healthz`
- RFC 9457 problem+json responses for unknown routes and errors
- Optional OpenTelemetry tracing via OTLP HTTP exporter
- Ready-to-run npm scripts (`dev`, `start`, `validate:all`)
- Vitest test suite with Supertest assertions

## Getting Started

```bash
cd services/repair
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:3003/healthz` to verify the service is running.

## Scripts

- `npm run dev` – Start the development server with hot reload
- `npm run start` – Start the server once
- `npm run build` – Type-check and emit JavaScript to `dist/`
- `npm run lint` – Lint source and test files using the repository ESLint config
- `npm run typecheck` – Type-check without emitting output
- `npm test` – Execute the Vitest suite
- `npm run validate:all` – Run lint, typecheck, and tests

## Telemetry

Set `OTEL_ENABLED=1` (or `true`) to enable OpenTelemetry traces. Configure the collector endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`. Override the service resource name with `SERVICE_NAME`.

## Problem Details

Problem details responses follow RFC 9457 and are enabled automatically in development and test environments. Override with `PROBLEM_DETAILS_ENABLED=0` to disable or `=1` to force-enable in production.

## Next Steps

- Add domain-specific routes under `src/routes/`
- Extend tests under `tests/`
- Configure CI using the per-service `validate:all` script
