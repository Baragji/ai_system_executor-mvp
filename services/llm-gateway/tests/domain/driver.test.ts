import { describe, expect, it, vi } from "vitest";

import {
  createLLMGatewayDriver,
  createUnconfiguredDriver,
  mapToolSchemas,
  ProviderNotConfiguredError,
} from "../../src/domain/index.js";

describe("mapToolSchemas", () => {
  it("returns provider schemas without mutating original", () => {
    const tools = [
      { name: "alpha", description: "A", parameters: { type: "object" } },
      { name: "beta", description: "B", parameters: { type: "object", properties: {} } },
    ];

    const mapped = mapToolSchemas(tools);

    expect(mapped).toEqual([
      { name: "alpha", description: "A", parameters: { type: "object" } },
      { name: "beta", description: "B", parameters: { type: "object", properties: {} } },
    ]);
    expect(mapped[0]).not.toBe(tools[0]);
  });
});

describe("createLLMGatewayDriver", () => {
  it("delegates to provider", async () => {
    const generate = vi.fn(async () => ({ content: "{}" }));
    const driver = createLLMGatewayDriver({ generate });

    const result = await driver.complete(
      [{ role: "user", content: "hi" }],
      { tools: [{ name: "alpha", description: "A", parameters: {} }] },
    );

    expect(result).toEqual({ content: "{}" });
    expect(generate).toHaveBeenCalledWith(
      [{ role: "user", content: "hi" }],
      {
        tools: [{ name: "alpha", description: "A", parameters: {} }],
        signal: undefined,
        onToken: undefined,
      },
    );
  });
});

describe("createUnconfiguredDriver", () => {
  it("throws provider not configured", async () => {
    const driver = createUnconfiguredDriver();
    await expect(driver.complete([{ role: "user", content: "hi" }])).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });
});
