import { describe, expect, it } from "vitest";

import { suggestDefaults } from "../../src/clarification/suggestDefaults.js";

describe("suggestDefaults", () => {
  it("suggests FastAPI for Python API prompts", () => {
    const prompt = "Build a Python API for managing tasks";
    const result = suggestDefaults(prompt, ["framework"]);
    expect(result.framework).toBe("FastAPI");
  });

  it("suggests Express for Node prompts", () => {
    const prompt = "Create a Node.js API";
    const result = suggestDefaults(prompt, ["framework"]);
    expect(result.framework).toBe("Express");
  });

  it("suggests SQLite for simple apps", () => {
    const prompt = "Build a simple app that stores data";
    const result = suggestDefaults(prompt, ["database"]);
    expect(result.database).toBe("SQLite");
  });

  it("suggests PostgreSQL for production apps", () => {
    const prompt = "Build a production-grade backend service";
    const result = suggestDefaults(prompt, ["database"]);
    expect(result.database).toBe("PostgreSQL");
  });

  it("returns empty defaults for ambiguous prompts", () => {
    const prompt = "Describe art history";
    const result = suggestDefaults(prompt, ["framework", "database"]);
    expect(result).toEqual({});
  });

  it("returns empty defaults when no language hints", () => {
    const prompt = "Build an API";
    const result = suggestDefaults(prompt, ["framework"]);
    expect(result).toEqual({});
  });
});
