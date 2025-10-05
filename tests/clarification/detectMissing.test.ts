import { describe, expect, it } from "vitest";

import { detectMissing } from "../../src/clarification/detectMissing.js";
import type { MissingInfoType } from "../../src/clarification/types.js";

function expectMissing(prompt: string, expected: MissingInfoType[]) {
  const result = detectMissing(prompt);
  expect(result.sort()).toEqual(expected.sort());
}

describe("detectMissing", () => {
  const completePrompt =
    "Develop a web application using Express for the API and React for the UI, " +
    "run the backend on port 8080, persist data in PostgreSQL, secure the endpoints with JWT authentication, " +
    "style the interface with Tailwind CSS, and include unit tests with Jest.";

  it("returns empty array when prompt includes all critical info", () => {
    expectMissing(completePrompt, []);
  });

  it("identifies missing framework information", () => {
    const prompt =
      "Develop a web application, run the backend on port 8080, persist data in PostgreSQL, secure the endpoints with JWT authentication, " +
      "style the interface with Tailwind CSS, and include unit tests with Jest.";
    expectMissing(prompt, ["framework"]);
  });

  it("identifies missing port information", () => {
    const prompt =
      "Develop a web application using Express for the API and React for the UI, persist data in PostgreSQL, secure the endpoints with JWT authentication, " +
      "style the interface with Tailwind CSS, and include unit tests with Jest.";
    expectMissing(prompt, ["port"]);
  });

  it("identifies missing database information when data persistence mentioned", () => {
    const prompt =
      "Develop a web application using Express for the API and React for the UI, run the backend on port 8080, persist the data layer, secure the endpoints with JWT authentication, " +
      "style the interface with Tailwind CSS, and include unit tests with Jest.";
    expectMissing(prompt, ["database"]);
  });

  it("identifies missing authentication detail", () => {
    const prompt =
      "Develop a web application using Express for the API and React for the UI, run the backend on port 8080, persist data in PostgreSQL, " +
      "add authentication for users, style the interface with Tailwind CSS, and include unit tests with Jest.";
    expectMissing(prompt, ["authentication"]);
  });

  it("identifies missing styling preference", () => {
    const prompt =
      "Develop a frontend application using Express for the API and React for the UI, run the backend on port 8080, persist data in PostgreSQL, secure the endpoints with JWT authentication, " +
      "design the interface for dashboards, and include unit tests with Jest.";
    expectMissing(prompt, ["styling"]);
  });

  it("identifies missing test framework", () => {
    const prompt =
      "Develop a web application using Express for the API and React for the UI, run the backend on port 8080, persist data in PostgreSQL, secure the endpoints with JWT authentication, " +
      "style the interface with Tailwind CSS, and include automated tests.";
    expectMissing(prompt, ["testFramework"]);
  });
});
