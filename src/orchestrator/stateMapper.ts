import type { OrchestratorState } from "./stateMachine.js";

export function mapStageToState(stage: string, done?: boolean): OrchestratorState | null {
  if (done) {
    return "DONE";
  }
  switch (stage) {
    case "analyzing":
      return "CLARIFYING";
    case "planning":
      return "PLANNING";
    case "generating":
    case "testing":
      return "GENERATING";
    case "finalizing":
      return "GENERATING";
    default:
      return null;
  }
}

export function stateToStage(state: OrchestratorState): string {
  switch (state) {
    case "CLARIFYING":
      return "analyzing";
    case "PLANNING":
      return "planning";
    case "GENERATING":
      return "generating";
    case "PAUSED":
      return "paused";
    case "DONE":
      return "finalizing";
    default:
      return "analyzing";
  }
}
