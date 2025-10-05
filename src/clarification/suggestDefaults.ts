import type { MissingInfoType } from "./types.js";

type SuggestionMap = Record<string, unknown>;

interface KeywordMatch<T> {
  keyword: string;
  value: T;
}

const FRAMEWORK_MENTIONS: KeywordMatch<string>[] = [
  { keyword: "fastapi", value: "FastAPI" },
  { keyword: "flask", value: "Flask" },
  { keyword: "django", value: "Django" },
  { keyword: "express", value: "Express" }
];

const LANGUAGE_HINTS: KeywordMatch<string>[] = [
  { keyword: "python", value: "FastAPI" },
  { keyword: "py", value: "FastAPI" },
  { keyword: "node.js", value: "Express" },
  { keyword: "nodejs", value: "Express" },
  { keyword: "node", value: "Express" },
  { keyword: "javascript", value: "Express" },
  { keyword: "typescript", value: "Express" }
];

const DATABASE_KEYWORDS: KeywordMatch<string>[] = [
  { keyword: "postgresql", value: "PostgreSQL" },
  { keyword: "postgres", value: "PostgreSQL" },
  { keyword: "mysql", value: "MySQL" },
  { keyword: "sqlite", value: "SQLite" }
];

const SIMPLE_HINTS = /\b(simple|basic|prototype|demo|toy)\b/;
const PRODUCTION_HINTS = /\b(production|enterprise|scalable|scale|mission[-\s]?critical)\b/;

const PORT_PATTERNS = [
  /\bport(?: number)?\s*(?:is|=|:)?\s*(\d{2,5})\b/i,
  /\blistening on\s*(?:port\s*)?(\d{2,5})\b/i,
  /:(\d{2,5})(?:\b|\s)/
];

function findFirstMatch<T>(text: string, matches: KeywordMatch<T>[]): KeywordMatch<T> | null {
  let best: KeywordMatch<T> | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const entry of matches) {
    const idx = text.indexOf(entry.keyword);
    if (idx === -1) continue;
    if (idx < bestIndex) {
      best = entry;
      bestIndex = idx;
    }
  }
  return best;
}

function suggestFramework(prompt: string, missingTypes: Set<string>): SuggestionMap {
  const suggestions: SuggestionMap = {};
  if (!missingTypes.has("framework")) {
    return suggestions;
  }

  const normalized = prompt.toLowerCase();
  const explicit = findFirstMatch(normalized, FRAMEWORK_MENTIONS);
  if (explicit) {
    suggestions.framework = explicit.value;
    return suggestions;
  }

  const hinted = findFirstMatch(normalized, LANGUAGE_HINTS);
  if (hinted) {
    suggestions.framework = hinted.value;
  }
  return suggestions;
}

function suggestDatabase(prompt: string, missingTypes: Set<string>): SuggestionMap {
  const suggestions: SuggestionMap = {};
  if (!missingTypes.has("database")) {
    return suggestions;
  }

  const normalized = prompt.toLowerCase();
  const explicit = findFirstMatch(normalized, DATABASE_KEYWORDS);
  if (explicit) {
    suggestions.database = explicit.value;
    return suggestions;
  }

  if (PRODUCTION_HINTS.test(normalized)) {
    suggestions.database = "PostgreSQL";
  } else if (SIMPLE_HINTS.test(normalized)) {
    suggestions.database = "SQLite";
  }

  return suggestions;
}

function suggestPort(prompt: string, missingTypes: Set<string>): SuggestionMap {
  const suggestions: SuggestionMap = {};
  if (!missingTypes.has("port")) {
    return suggestions;
  }

  for (const pattern of PORT_PATTERNS) {
    const match = pattern.exec(prompt);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(value)) continue;
    if (value < 1 || value > 65535) continue;
    suggestions.port = value;
    break;
  }

  return suggestions;
}

export function suggestDefaults(prompt: string, missingTypes: MissingInfoType[]): Record<string, unknown> {
  if (!prompt || missingTypes.length === 0) {
    return {};
  }

  const missing = new Set<MissingInfoType>(missingTypes);
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return {};
  }

  const suggestions: SuggestionMap = {};
  Object.assign(suggestions, suggestFramework(normalizedPrompt, missing));
  Object.assign(suggestions, suggestDatabase(normalizedPrompt, missing));
  Object.assign(suggestions, suggestPort(prompt, missing));

  return suggestions;
}
