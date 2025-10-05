import type { ClarificationAnswer, ClarificationResponse } from "./types.js";

const LABEL_OVERRIDES: Record<string, string> = {
  framework: "Framework",
  port: "Port",
  database: "Database",
  authentication: "Authentication",
  styling: "Styling",
  testFramework: "Test Framework"
};

function formatLabel(questionId: string): string {
  const override = LABEL_OVERRIDES[questionId];
  if (override) return override;
  const normalized = questionId
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return normalized.replace(/(^|\s)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function normalizeValue(answer: ClarificationAnswer): string | null {
  const value = answer.value;
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return null;
}

export function augmentPrompt(originalPrompt: string, clarifications: ClarificationResponse): string {
  if (!clarifications || !Array.isArray(clarifications.answers) || clarifications.answers.length === 0) {
    return originalPrompt;
  }

  const formatted: string[] = [];
  for (const answer of clarifications.answers) {
    const value = normalizeValue(answer);
    if (!value) continue;
    const label = formatLabel(answer.questionId);
    formatted.push(`${label}: ${value}`);
  }

  if (formatted.length === 0) {
    return originalPrompt;
  }

  const context = formatted.join(", ");
  const prefix = `${context}`;
  const originalHeader = originalPrompt.startsWith("Original request:")
    ? originalPrompt
    : `Original request: ${originalPrompt}`;
  return `${prefix}\n\n${originalHeader}`;
}
