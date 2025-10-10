import { EventEmitter } from "node:events";

export const ORCHESTRATOR_STATES = [
  "CLARIFYING",
  "PLANNING",
  "GENERATING",
  "PAUSED",
  "DONE"
] as const;

export type OrchestratorState = (typeof ORCHESTRATOR_STATES)[number];

export interface StateTransition {
  previous: OrchestratorState;
  current: OrchestratorState;
  reason?: string;
  timestamp: string;
}

const TRANSITIONS: Readonly<Record<OrchestratorState, ReadonlySet<OrchestratorState>>> = {
  CLARIFYING: new Set(["PLANNING", "GENERATING", "PAUSED"]),
  PLANNING: new Set(["GENERATING", "PAUSED"]),
  GENERATING: new Set(["PAUSED", "DONE"]),
  PAUSED: new Set(["CLARIFYING", "PLANNING", "GENERATING"]),
  DONE: new Set()
};

export interface TransitionOptions {
  reason?: string;
  at?: Date;
}

export class OrchestratorStateMachine extends EventEmitter {
  #state: OrchestratorState;
  #history: StateTransition[];

  constructor(initial: OrchestratorState = "CLARIFYING") {
    super();
    if (!ORCHESTRATOR_STATES.includes(initial)) {
      throw new Error(`Invalid initial state: ${initial}`);
    }
    const now = new Date().toISOString();
    this.#state = initial;
    this.#history = [{ previous: initial, current: initial, timestamp: now }];
  }

  get state(): OrchestratorState {
    return this.#state;
  }

  get history(): StateTransition[] {
    return this.#history.map(entry => ({ ...entry }));
  }

  canTransition(target: OrchestratorState): boolean {
    if (target === this.#state) {
      return false;
    }
    const allowed = TRANSITIONS[this.#state];
    return allowed.has(target);
  }

  transition(target: OrchestratorState, options: TransitionOptions = {}): OrchestratorState {
    if (!ORCHESTRATOR_STATES.includes(target)) {
      throw new Error(`Unknown state: ${target}`);
    }

    if (!this.canTransition(target)) {
      const allowed = Array.from(TRANSITIONS[this.#state]).join(", ") || "<none>";
      throw new Error(`Invalid transition: ${this.#state} -> ${target} (allowed: ${allowed})`);
    }

    const timestamp = (options.at ?? new Date()).toISOString();
    const previous = this.#state;
    this.#state = target;
    const entry: StateTransition = {
      previous,
      current: target,
      reason: options.reason,
      timestamp
    };
    this.#history.push(entry);
    this.emit("stateChanged", entry);
    return this.#state;
  }
}
