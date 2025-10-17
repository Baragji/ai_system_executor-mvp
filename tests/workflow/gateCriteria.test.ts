import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LEDGER_PATH,
  parseGateCriteria,
  requireCriterionText
} from "../../workflow/lib/gateCriteria.js";

let ledgerContent: string;

const RESOLVED_LEDGER_PATH = path.resolve(LEDGER_PATH);

beforeAll(async () => {
  ledgerContent = await fs.readFile(RESOLVED_LEDGER_PATH, "utf-8");
});

describe("gateCriteria parser", () => {
  it("parses acceptance criteria for Gate G2", () => {
    const index = parseGateCriteria(ledgerContent);
    const gate = index.G2;

    expect(gate).toBeDefined();
    const sbom = gate?.find(entry => entry.text.includes("npm run sbom:cyclonedx"));
    expect(sbom).toBeDefined();
    expect(sbom?.status).toBe("✅");
    expect(sbom?.lineNumber).toBeGreaterThan(0);
  });

  it("provides canonical text via requireCriterionText", () => {
    const criterion = requireCriterionText({
      gateId: "G3",
      includes: ["LangGraph integration", "/api/execute"]
    });

    expect(criterion).toContain("LangGraph integration");
    expect(criterion).toContain("/api/execute");
  });
});
