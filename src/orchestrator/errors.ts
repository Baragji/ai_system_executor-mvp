import type { CheckpointRecord } from "./checkpoints.js";

export class PausedError extends Error {
  public readonly sessionId: string;
  public readonly checkpoint: CheckpointRecord | undefined;

  constructor(sessionId: string, checkpoint: CheckpointRecord | undefined, message?: string) {
    super(message ?? `Session ${sessionId} paused`);
    this.name = "PausedError";
    this.sessionId = sessionId;
    this.checkpoint = checkpoint;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
