import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import { propagation } from "@opentelemetry/api";
import { describe, expect, it, vi } from "vitest";

import { fetchJson } from "../src/lib/httpClient.js";

type TestServer = {
  url: string;
  close: () => Promise<void>;
};

function getHeaderValue(headers: IncomingHttpHeaders, key: string): string | undefined {
  const value = headers[key];
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function createTestServer(
  handler: Parameters<typeof createServer>[0],
): Promise<TestServer> {
  const server = createServer(handler);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unexpected server address");
  }

  const { port } = address as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

describe("fetchJson", () => {
  it("adds a correlation id when one is not provided", async () => {
    let receivedHeaders: IncomingHttpHeaders | undefined;

    const server = await createTestServer((req, res) => {
      receivedHeaders = req.headers;
      res.setHeader("content-type", "application/json");
      res.write(JSON.stringify({ ok: true }));
      res.end();
    });

    try {
      const result = await fetchJson<{ ok: boolean }>(`${server.url}/correlation`);
      expect(result).toEqual({ ok: true });

      const correlation = receivedHeaders ? getHeaderValue(receivedHeaders, "x-correlation-id") : undefined;
      expect(correlation).toBeDefined();
      expect(correlation).toMatch(/^[0-9a-f-]{36}$/i);
    } finally {
      await server.close();
    }
  });

  it("reuses an existing correlation id", async () => {
    let receivedHeaders: IncomingHttpHeaders | undefined;

    const server = await createTestServer((req, res) => {
      receivedHeaders = req.headers;
      res.setHeader("content-type", "application/json");
      res.write(JSON.stringify({ ok: true }));
      res.end();
    });

    try {
      const existingId = "fixed-correlation-id";
      await fetchJson(`${server.url}/existing`, {
        headers: {
          "x-correlation-id": existingId,
        },
      });

      const correlation = receivedHeaders ? getHeaderValue(receivedHeaders, "x-correlation-id") : undefined;
      expect(correlation).toBe(existingId);
    } finally {
      await server.close();
    }
  });

  it("injects trace headers returned by the propagator", async () => {
    let receivedHeaders: IncomingHttpHeaders | undefined;

    const server = await createTestServer((req, res) => {
      receivedHeaders = req.headers;
      res.setHeader("content-type", "application/json");
      res.write(JSON.stringify({ ok: true }));
      res.end();
    });

    const injectSpy = vi.spyOn(propagation, "inject").mockImplementation((_, carrier) => {
      (carrier as Record<string, string>).traceparent = "00-test-trace-id-test-span-id-01";
    });

    try {
      await fetchJson(`${server.url}/trace`);

      expect(injectSpy).toHaveBeenCalledOnce();
      const traceparent = receivedHeaders ? getHeaderValue(receivedHeaders, "traceparent") : undefined;
      expect(traceparent).toBe("00-test-trace-id-test-span-id-01");
    } finally {
      injectSpy.mockRestore();
      await server.close();
    }
  });
});
