import { MissingInfoType } from "./types.js";

const FRAMEWORK_KEYWORDS = [
  "express",
  "fastapi",
  "flask",
  "django",
  "rails",
  "spring",
  "laravel",
  "nest",
  "next.js",
  "nextjs",
  "nuxt",
  "sveltekit",
  "svelte",
  "react",
  "vue",
  "angular"
];

const DATABASE_KEYWORDS = [
  "postgres",
  "postgresql",
  "mysql",
  "sqlite",
  "mongodb",
  "mongo",
  "dynamodb",
  "redis"
];

const AUTH_KEYWORDS = [
  "jwt",
  "oauth",
  "session",
  "token",
  "auth0",
  "basic auth",
  "oidc",
  "saml"
];

const STYLING_KEYWORDS = [
  "tailwind",
  "bootstrap",
  "chakra",
  "material ui",
  "mui",
  "bulma",
  "ant design",
  "css modules",
  "scss",
  "sass"
];

const TEST_KEYWORDS = [
  "jest",
  "vitest",
  "mocha",
  "ava",
  "pytest",
  "unittest",
  "nose",
  "rspec"
];

const PROJECT_TERMS = [
  "app",
  "application",
  "api",
  "service",
  "server",
  "backend",
  "frontend",
  "website",
  "dashboard",
  "interface"
];

function hasAny(input: string, keywords: string[]): boolean {
  return keywords.some(keyword => input.includes(keyword));
}

function hasPort(normalized: string): boolean {
  if (/\bport\s*(\d{2,5})\b/.test(normalized)) return true;
  if (/:(\d{2,5})(\s|$)/.test(normalized)) return true;
  return false;
}

export function detectMissing(prompt: string): MissingInfoType[] {
  const normalized = prompt.toLowerCase();
  const trimmed = normalized.trim();
  if (!trimmed) {
    return [
      "framework",
      "port",
      "database",
      "authentication",
      "styling",
      "testFramework"
    ];
  }

  // Treat prompts that mention common project terms or known frameworks as software requests.
  // Previously required BOTH a software verb and a project term; that missed prompts like
  // "simple frontend with quiz". Relaxing to project/framework detection improves UX.
  const isSoftwareRequest = hasAny(trimmed, PROJECT_TERMS) || hasAny(trimmed, FRAMEWORK_KEYWORDS);
  if (!isSoftwareRequest) {
    return [];
  }

  const missing = new Set<MissingInfoType>();

  const hasFramework = hasAny(trimmed, FRAMEWORK_KEYWORDS);
  if (!hasFramework) {
    missing.add("framework");
  }

  const needsPort = hasAny(trimmed, ["api", "service", "server", "backend", "express", "fastapi"]);
  if (needsPort && !hasPort(trimmed)) {
    missing.add("port");
  }

  const mentionsData = hasAny(trimmed, ["database", "data", "persist", "store", "records", "db"]);
  const hasDatabase = hasAny(trimmed, DATABASE_KEYWORDS);
  if (mentionsData && !hasDatabase) {
    missing.add("database");
  }

  const mentionsAuth = hasAny(trimmed, ["auth", "authentication", "login", "signup", "secure", "oauth", "jwt"]);
  const hasAuthDetail = hasAny(trimmed, AUTH_KEYWORDS);
  if (mentionsAuth && !hasAuthDetail) {
    missing.add("authentication");
  }

  const mentionsStyling = hasAny(trimmed, ["ui", "frontend", "design", "style", "interface", "layout"]);
  const hasStylingDetail = hasAny(trimmed, STYLING_KEYWORDS);
  if (mentionsStyling && !hasStylingDetail) {
    missing.add("styling");
  }

  const mentionsTests = hasAny(trimmed, ["test", "tests", "testing", "unit"]);
  const hasTestFramework = hasAny(trimmed, TEST_KEYWORDS);
  if (mentionsTests && !hasTestFramework) {
    missing.add("testFramework");
  }

  return Array.from(missing);
}
