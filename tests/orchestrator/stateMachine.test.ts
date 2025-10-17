import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";

import {
  OrchestratorStateMachine,
  type OrchestratorState,
  type StateTransition
} from "../../src/orchestrator/stateMachine.js";

describe("OrchestratorStateMachine", () => {
  it("starts in CLARIFYING by default", () => {
    const machine = new OrchestratorStateMachine();
    expect(machine.state).toBe("CLARIFYING");
    expect(machine.history.at(-1)?.current).toBe("CLARIFYING");
  });

  it("supports configured transition graph", () => {
    const machine = new OrchestratorStateMachine();
    expect(machine.transition("PLANNING")).toBe("PLANNING");
    expect(machine.transition("GENERATING")).toBe("GENERATING");
    expect(machine.transition("PAUSED")).toBe("PAUSED");
    expect(machine.transition("GENERATING")).toBe("GENERATING");
    expect(machine.transition("DONE")).toBe("DONE");
  });

  it("emits events on transitions", () => {
    const machine = new OrchestratorStateMachine();
    const events: StateTransition[] = [];
    machine.on("stateChanged", event => events.push(event));

    machine.transition("PLANNING", { reason: "clarifications complete" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      previous: "CLARIFYING",
      current: "PLANNING",
      reason: "clarifications complete"
    });
    expect(Date.parse(events[0].timestamp)).toBeGreaterThan(0);
  });

  it("rejects invalid transitions", () => {
    const machine = new OrchestratorStateMachine();
    expect(() => machine.transition("DONE")).toThrowError(/Invalid transition/);
    machine.transition("PLANNING");
    machine.transition("GENERATING");
    machine.transition("DONE");
    expect(() => machine.transition("CLARIFYING")).toThrowError(/Invalid transition/);
  });

  it("prevents redundant transitions", () => {
    const machine = new OrchestratorStateMachine();
    expect(() => machine.transition("CLARIFYING")).toThrowError(/Invalid transition/);
  });

  it("validates initial state", () => {
    expect(() => new OrchestratorStateMachine("INVALID" as unknown as OrchestratorState)).toThrowError(/Invalid initial state/);
  });

  it("validates requested state", () => {
    const machine = new OrchestratorStateMachine();
    expect(() => machine.transition("NOT_REAL" as unknown as OrchestratorState)).toThrowError(/Unknown state/);
  });

  it("provides immutable history copy", () => {
    const machine = new OrchestratorStateMachine();
    const history = machine.history;
    expect(() => {
      (history as StateTransition[])[0].current = "DONE";
    }).not.toThrow();
    expect(machine.history[0].current).toBe("CLARIFYING");
  });

  it("implements EventEmitter", () => {
    const machine = new OrchestratorStateMachine();
    expect(machine).toBeInstanceOf(EventEmitter);
  });

  it("can transition out of pause to multiple states", () => {
    const machine = new OrchestratorStateMachine();
    machine.transition("PLANNING");
    machine.transition("PAUSED");
    expect(machine.canTransition("GENERATING")).toBe(true);
    expect(machine.canTransition("CLARIFYING")).toBe(true);
    expect(machine.canTransition("DONE")).toBe(false);
  });

  it("records history entries for each move", () => {
    const machine = new OrchestratorStateMachine();
    machine.transition("PLANNING");
    machine.transition("GENERATING");
    expect(machine.history).toHaveLength(3);
    const last = machine.history.at(-1)!;
    expect(last.previous).toBe("PLANNING");
    expect(last.current).toBe("GENERATING");
  });
});
