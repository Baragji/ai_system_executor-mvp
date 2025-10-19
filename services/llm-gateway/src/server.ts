import { config } from "dotenv";
import express, { type Express } from "express";

import { createLLMGatewayDriver, createUnconfiguredDriver } from "./domain/index.js";
import { installProblemDetails } from "./middleware/problemDetails.js";
import { createCompleteRouter } from "./routes/complete.js";
import { createHealthRouter } from "./routes/health.js";
import { createStreamRouter } from "./routes/stream.js";
import { maybeInitTelemetry, shutdownTelemetry } from "./telemetry/otel.js";

config();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

type ShutdownSignal = "SIGINT" | "SIGTERM";

function resolveDriver() {
  // Placeholder driver; real provider wiring will land in a follow-up task.
  if (process.env.LLM_GATEWAY_PROVIDER === "mock") {
    const provider = {
      async generate() {
        return { content: "{}" };
      },
    };
    return createLLMGatewayDriver(provider);
  }
  return createUnconfiguredDriver();
}

export function createApp(driver = resolveDriver()): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(createHealthRouter());
  app.use(createCompleteRouter(driver));
  app.use(createStreamRouter(driver));

  installProblemDetails(app);

  return app;
}

async function start(): Promise<void> {
  maybeInitTelemetry();

  const driver = resolveDriver();
  const app = createApp(driver);
  const port = Number.parseInt(process.env.PORT ?? "4005", 10);

  const server = app.listen(port, () => {
    console.log(`[llm-gateway] Listening on http://localhost:${port}`);
  });

  const shutdown = async (signal: ShutdownSignal) => {
    console.log(`[llm-gateway] Received ${signal}, shutting down...`);
    server.close(async () => {
      await shutdownTelemetry();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

if (process.env.NODE_ENV !== "test") {
  void start();
}

export type { Express };
