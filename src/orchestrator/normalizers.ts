import type { InterruptQuestionInput } from "./interrupts.js";
import type { ResumeAnswer } from "./resume.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeInterruptQuestions(input: unknown): InterruptQuestionInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const supportedTypes = new Set(["AMBIGUITY", "APPROVAL", "BUDGET_RISK"]);
  const questions: InterruptQuestionInput[] = [];

  for (const entry of input) {
    if (!isPlainObject(entry)) continue;
    const questionRaw = typeof entry.question === "string" ? entry.question.trim() : "";
    if (!questionRaw) continue;

    const typeRaw = typeof entry.type === "string" ? entry.type.trim().toUpperCase() : "";
    const type = supportedTypes.has(typeRaw) ? (typeRaw as InterruptQuestionInput["type"]) : "AMBIGUITY";
    const id = typeof entry.id === "string" ? entry.id.trim() || undefined : undefined;
    const metadata = isPlainObject(entry.metadata) ? (entry.metadata as Record<string, unknown>) : undefined;

    questions.push({
      ...(id ? { id } : {}),
      question: questionRaw,
      type,
      ...(metadata ? { metadata } : {})
    });
  }

  return questions;
}

export function normalizeResumeAnswers(input: unknown): ResumeAnswer[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const answers: ResumeAnswer[] = [];
  for (const entry of input) {
    if (!isPlainObject(entry)) continue;
    const questionId = typeof entry.questionId === "string" ? entry.questionId.trim() : "";
    const value = (entry as Record<string, unknown>).value;
    answers.push({ questionId, value });
  }
  return answers;
}
