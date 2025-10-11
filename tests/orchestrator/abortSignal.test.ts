import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAbortSignal,
  checkAborted,
  abortSession,
  cleanupAbortSignal,
  getAbortSignal,
  onAbort,
  throwIfAborted,
  PausedError,
  getActiveAbortSignals
} from "../../src/orchestrator/abortSignal.js";

describe("abortSignal", () => {
  beforeEach(() => {
    // Clean up any leftover signals
    const active = getActiveAbortSignals();
    active.forEach((sessionId: string) => cleanupAbortSignal(sessionId));
  });

  describe("createAbortSignal", () => {
    it("creates a new abort signal for a session", () => {
      const signal = createAbortSignal("test-session");
      expect(signal).toBeDefined();
      expect(signal.aborted).toBe(false);
    });

    it("throws error if sessionId is empty", () => {
      expect(() => createAbortSignal("")).toThrow("sessionId is required");
    });

    it("replaces existing signal for same session", () => {
      const signal1 = createAbortSignal("test-session");
      const signal2 = createAbortSignal("test-session");
      
      expect(signal1.aborted).toBe(true); // Old signal aborted
      expect(signal2.aborted).toBe(false); // New signal active
    });
  });

  describe("checkAborted", () => {
    it("returns false if session not found", () => {
      expect(checkAborted("nonexistent")).toBe(false);
    });

    it("returns false if sessionId is undefined", () => {
      expect(checkAborted(undefined)).toBe(false);
    });

    it("returns false if signal not aborted", () => {
      createAbortSignal("test-session");
      expect(checkAborted("test-session")).toBe(false);
    });

    it("returns true if signal is aborted", () => {
      createAbortSignal("test-session");
      abortSession("test-session");
      expect(checkAborted("test-session")).toBe(true);
    });
  });

  describe("abortSession", () => {
    it("returns false if session not found", () => {
      expect(abortSession("nonexistent")).toBe(false);
    });

    it("aborts the signal and returns true", () => {
      const signal = createAbortSignal("test-session");
      expect(signal.aborted).toBe(false);
      
      const result = abortSession("test-session");
      expect(result).toBe(true);
      expect(signal.aborted).toBe(true);
    });

    it("is idempotent - multiple aborts are safe", () => {
      createAbortSignal("test-session");
      
      expect(abortSession("test-session")).toBe(true);
      expect(abortSession("test-session")).toBe(true); // Still returns true
      expect(checkAborted("test-session")).toBe(true);
    });
  });

  describe("cleanupAbortSignal", () => {
    it("removes signal from tracking", () => {
      createAbortSignal("test-session");
      expect(getAbortSignal("test-session")).toBeDefined();
      
      cleanupAbortSignal("test-session");
      expect(getAbortSignal("test-session")).toBeUndefined();
    });

    it("is safe to call on nonexistent session", () => {
      expect(() => cleanupAbortSignal("nonexistent")).not.toThrow();
    });
  });

  describe("getAbortSignal", () => {
    it("returns undefined if session not found", () => {
      expect(getAbortSignal("nonexistent")).toBeUndefined();
    });

    it("returns the signal if session exists", () => {
      const signal = createAbortSignal("test-session");
      const retrieved = getAbortSignal("test-session");
      expect(retrieved).toBe(signal);
    });
  });

  describe("onAbort", () => {
    it("triggers callback when session is aborted", () => {
      const callback = vi.fn();
      createAbortSignal("test-session");
      onAbort("test-session", callback);
      
      abortSession("test-session");
      
      expect(callback).toHaveBeenCalledWith("test-session");
    });

    it("does nothing if session doesn't exist", () => {
      const callback = vi.fn();
      onAbort("nonexistent", callback);
      
      // Should not throw
      expect(callback).not.toHaveBeenCalled();
    });

    it("only triggers once (uses .once internally)", () => {
      const callback = vi.fn();
      createAbortSignal("test-session");
      onAbort("test-session", callback);
      
      abortSession("test-session");
      abortSession("test-session"); // Second abort
      
      expect(callback).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe("throwIfAborted", () => {
    it("does nothing if sessionId is undefined", () => {
      expect(() => throwIfAborted(undefined, "test-phase")).not.toThrow();
    });

    it("does nothing if session not aborted", () => {
      createAbortSignal("test-session");
      expect(() => throwIfAborted("test-session", "test-phase")).not.toThrow();
    });

    it("throws PausedError if session is aborted", () => {
      createAbortSignal("test-session");
      abortSession("test-session");
      
      expect(() => throwIfAborted("test-session", "generation")).toThrow(PausedError);
    });

    it("includes phase in PausedError", () => {
      createAbortSignal("test-session");
      abortSession("test-session");
      
      try {
        throwIfAborted("test-session", "testing");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(PausedError);
        expect((error as PausedError).phase).toBe("testing");
        expect((error as PausedError).sessionId).toBe("test-session");
      }
    });
  });

  describe("PausedError", () => {
    it("constructs with sessionId and phase", () => {
      const error = new PausedError("session-123", "repair");
      expect(error.name).toBe("PausedError");
      expect(error.sessionId).toBe("session-123");
      expect(error.phase).toBe("repair");
      expect(error.message).toBe("Execution paused during repair");
    });

    it("accepts custom message", () => {
      const error = new PausedError("session-123", "llm-call", "Custom pause message");
      expect(error.message).toBe("Custom pause message");
    });
  });

  describe("getActiveAbortSignals", () => {
    it("returns empty array if no active signals", () => {
      expect(getActiveAbortSignals()).toEqual([]);
    });

    it("returns list of active session IDs", () => {
      createAbortSignal("session-1");
      createAbortSignal("session-2");
      createAbortSignal("session-3");
      
      const active = getActiveAbortSignals();
      expect(active).toHaveLength(3);
      expect(active).toContain("session-1");
      expect(active).toContain("session-2");
      expect(active).toContain("session-3");
    });

    it("excludes cleaned up sessions", () => {
      createAbortSignal("session-1");
      createAbortSignal("session-2");
      cleanupAbortSignal("session-1");
      
      const active = getActiveAbortSignals();
      expect(active).toEqual(["session-2"]);
    });
  });
});
