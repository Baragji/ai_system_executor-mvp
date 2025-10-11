import type { CheckpointRecord } from "./checkpoints.js";
import type { ResolvedQuestion } from "./resume.js";
import type { WorkspaceManifest } from "./workspaceManifest.js";
import { formatWorkspaceSummary } from "../workspace/manifest.js";

export interface ResumePromptOptions {
  projectSlug: string;
  originalPrompt: string;
  effectivePrompt?: string;
  adjustment?: string;
  checkpoint: CheckpointRecord;
  answeredQuestions: ResolvedQuestion[];
  manifest?: WorkspaceManifest | null;
}

export function buildResumeSystemPrompt(base: string): string {
  const trimmedBase = base.trimEnd();
  const guidance = [
    "## Resume Guidance",
    "You are resuming work on an existing project. Use the available MCP tools (list_directory, read_file, get_workspace_summary) to inspect the workspace before proposing changes.",
    "Prefer incremental updates that preserve working code, adjust only what is necessary, and keep automated tests passing.",
    "Always return strictly valid JSON that matches the executor schema."
  ].join("\n");
  return `${trimmedBase}\n\n${guidance}\n`;
}

export function buildResumeUserPrompt(options: ResumePromptOptions): string {
  const {
    projectSlug,
    originalPrompt,
    effectivePrompt,
    adjustment,
    checkpoint,
    answeredQuestions,
    manifest
  } = options;

  const sections: string[] = [];
  sections.push(`# Resume Execution Request for ${projectSlug}`);

  sections.push("## Original Objective", originalPrompt.trim() || "<unknown>");

  if (effectivePrompt && effectivePrompt.trim() && effectivePrompt.trim() !== originalPrompt.trim()) {
    sections.push("## Effective Prompt Used Previously", effectivePrompt.trim());
  }

  const adjustmentText = adjustment && adjustment.trim() ? adjustment.trim() : "Continue the previous plan while addressing any open questions.";
  sections.push("## User Adjustment", adjustmentText);

  const checkpointDetails: string[] = [];
  checkpointDetails.push(`- Last known state: ${checkpoint.state}`);
  checkpointDetails.push(`- Checkpoint saved at: ${checkpoint.updatedAt}`);
  const resumeToken = checkpoint.payload?.resumeToken;
  if (resumeToken) {
    checkpointDetails.push(`- Resume token: ${resumeToken}`);
  }
  if (checkpoint.payload?.executor?.projectSlug && checkpoint.payload.executor.projectSlug !== projectSlug) {
    checkpointDetails.push(`- Executor project slug at pause: ${checkpoint.payload.executor.projectSlug}`);
  }
  sections.push("## Checkpoint Snapshot", checkpointDetails.join("\n"));

  if (answeredQuestions.length > 0) {
    const qaLines = answeredQuestions.map(question => {
      const answerValue = typeof question.answer === "string" ? question.answer : JSON.stringify(question.answer);
      return `- ${question.question} → ${answerValue}`;
    });
    sections.push("## Answers Provided During Resume", qaLines.join("\n"));
  }

  if (manifest?.summary) {
    const summaryText = formatWorkspaceSummary(manifest.summary, { topFileCount: 8 });
    sections.push("## Workspace Manifest Summary", summaryText);
  } else {
    sections.push("## Workspace Manifest Summary", "No manifest snapshot was available. Use MCP tools to inspect the workspace structure.");
  }

  sections.push(
    "## Execution Guidance",
    "1. Inspect the current workspace with MCP tools before planning changes.",
    "2. Update only the files required to satisfy the adjustment while preserving existing functionality.",
    "3. Ensure hasTests remains true and keep or extend automated tests as needed.",
    "4. Return only the JSON payload; do not include explanations outside the JSON structure."
  );

  return sections.join("\n\n");
}

export function buildResumePrompts(baseSystemPrompt: string, options: ResumePromptOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: buildResumeSystemPrompt(baseSystemPrompt),
    userPrompt: buildResumeUserPrompt(options)
  };
}
