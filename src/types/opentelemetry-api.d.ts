declare module "@opentelemetry/api" {
  export const context: {
    active(): unknown;
    with<T>(context: unknown, fn: () => T): T;
  };

  export const trace: {
    getTracer(name: string, version?: string): {
      startSpan(name: string, options?: Record<string, unknown>, context?: unknown): Span | undefined;
    };
  };

  export const SpanStatusCode: {
    readonly ERROR: number;
    readonly OK: number;
  };

  export interface Span {
    end(): void;
    setAttribute(key: string, value: unknown): void;
    addEvent(name: string, attributes?: Record<string, unknown>): void;
    recordException(error: unknown): void;
    setStatus(status: { code: number; message?: string }): void;
  }
}
