import { config } from "dotenv";
import express, { type Express, type Request, type Response } from "express";

import { installProblemDetails, respondWithProblem } from "./middleware/problemDetails.js";
import { createClarifyRouter } from "./routes/clarify.js";
import { createHealthRouter } from "./routes/health.js";
import { maybeInitTelemetry, shutdownTelemetry } from "./telemetry/otel.js";

config();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

type ShutdownSignal = "SIGINT" | "SIGTERM";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(createHealthRouter());
  app.use(createClarifyRouter());

  installProblemDetails(app);

  app.use((req: Request, res: Response) => {
    const instance = req.originalUrl || req.url || "";
    respondWithProblem(res, 404, "Not Found", "Resource not found", instance, {
      method: req.method,
    });
  });

  return app;
}

async function start(): Promise<void> {
  maybeInitTelemetry();

  const app = createApp();
  const port = Number.parseInt(process.env.PORT ?? "3999", 10);

  const server = app.listen(port, () => {
    console.log(`[template] Listening on http://localhost:${port}`);
  });

  const shutdown = async (signal: ShutdownSignal) => {
    console.log(`[template] Received ${signal}, shutting down...`);
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
