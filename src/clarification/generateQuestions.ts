import { ClarificationQuestion, MissingInfoType } from "./types.js";

const QUESTION_TEMPLATES: Record<MissingInfoType, ClarificationQuestion> = {
  framework: {
    id: "framework",
    text: "Which framework should power this project?",
    type: "choice",
    options: ["FastAPI", "Flask", "Express", "Django"]
  },
  port: {
    id: "port",
    text: "Which port should the service listen on? (default 8000)",
    type: "number"
  },
  database: {
    id: "database",
    text: "Which database should be used?",
    type: "choice",
    options: ["PostgreSQL", "MySQL", "SQLite", "None"]
  },
  authentication: {
    id: "authentication",
    text: "Do you need authentication for this project?",
    type: "choice",
    options: ["Yes", "No"]
  },
  styling: {
    id: "styling",
    text: "What styling approach should the UI use?",
    type: "choice",
    options: ["Tailwind CSS", "Bootstrap", "Chakra UI", "No preference"]
  },
  testFramework: {
    id: "testFramework",
    text: "Which testing framework should be configured?",
    type: "choice",
    options: ["Jest", "Vitest", "Mocha", "Pytest"]
  }
};

export function generateQuestions(missing: MissingInfoType[]): ClarificationQuestion[] {
  const seen = new Set<MissingInfoType>();
  const questions: ClarificationQuestion[] = [];
  for (const type of missing) {
    if (seen.has(type)) continue;
    seen.add(type);
    const template = QUESTION_TEMPLATES[type];
    if (!template) continue;
    questions.push({ ...template, options: template.options ? [...template.options] : undefined });
  }
  return questions;
}
