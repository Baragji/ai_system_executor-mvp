import { isTelemetryEnabled, maybeInitTelemetry } from "./otel.js";

type PrimitiveAttribute = string | number | boolean;
type AttributeValue = PrimitiveAttribute | PrimitiveAttribute[];

type OtelApi = {
  trace?: {
    getTracer(name: string, version?: string): {
      startSpan(name: string, options?: Record<string, unknown>, context?: unknown): OtelSpan | undefined;
    };
  };
  context?: {
    active(): unknown;
  };
  SpanStatusCode?: {
    ERROR?: number;
    OK?: number;
  };
};

type OtelSpan = {
  end(): void;
  setAttribute?(key: string, value: AttributeValue): void;
  addEvent?(name: string, attributes?: Record<string, AttributeValue>): void;
  recordException?(error: unknown): void;
  setStatus?(status: { code: number; message?: string }): void;
};

export type SpanStatus = {
  code: "ok" | "error";
  message?: string;
};

export interface InstrumentedSpan {
  setAttributes(attributes: Record<string, unknown>): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  recordException(error: unknown): void;
  end(status?: SpanStatus): void;
}

const noopSpan: InstrumentedSpan = {
  setAttributes: () => void 0,
  addEvent: () => void 0,
  recordException: () => void 0,
  end: () => void 0
};

let apiPromise: Promise<OtelApi | null> | null = null;

function loadOtelApi(): Promise<OtelApi | null> {
  if (!apiPromise) {
    apiPromise = import("@opentelemetry/api")
      .then(mod => mod as unknown as OtelApi)
      .catch(() => null);
  }
  return apiPromise;
}

function sanitizeValue(value: unknown): AttributeValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    return undefined;
  }
  if (Array.isArray(value)) {
    const mapped: PrimitiveAttribute[] = [];
    for (const item of value) {
      const sanitized = sanitizeValue(item);
      if (sanitized === undefined) continue;
      if (Array.isArray(sanitized)) {
        mapped.push(...sanitized);
      } else {
        mapped.push(sanitized);
      }
    }
    return mapped.length > 0 ? mapped : undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function applyAttributes(span: OtelSpan, attributes: Record<string, unknown>): void {
  if (!span.setAttribute) return;
  for (const [key, raw] of Object.entries(attributes)) {
    const sanitized = sanitizeValue(raw);
    if (sanitized === undefined) continue;
    try {
      span.setAttribute(key, sanitized);
    } catch {
      // ignore attribute failures
    }
  }
}

function applyEvent(span: OtelSpan, name: string, attributes?: Record<string, unknown>): void {
  if (!span.addEvent) return;
  const payload: Record<string, AttributeValue> = {};
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      const sanitized = sanitizeValue(value);
      if (sanitized !== undefined) {
        payload[key] = sanitized;
      }
    }
  }
  try {
    span.addEvent(name, payload);
  } catch {
    // ignore event failures
  }
}

function createInstrumentedSpan(api: OtelApi, span: OtelSpan): InstrumentedSpan {
  let ended = false;
  return {
    setAttributes: attrs => {
      if (ended) return;
      applyAttributes(span, attrs);
    },
    addEvent: (name, attrs) => {
      if (ended) return;
      applyEvent(span, name, attrs);
    },
    recordException: error => {
      if (ended) return;
      if (span.recordException) {
        try {
          span.recordException(error);
        } catch {
          // ignore
        }
      }
      if (span.setStatus && api.SpanStatusCode?.ERROR !== undefined) {
        try {
          span.setStatus({ code: api.SpanStatusCode.ERROR ?? 2, message: error instanceof Error ? error.message : String(error) });
        } catch {
          // ignore
        }
      }
    },
    end: status => {
      if (ended) return;
      ended = true;
      if (status && span.setStatus) {
        const code = status.code === "error" ? api.SpanStatusCode?.ERROR ?? 2 : api.SpanStatusCode?.OK ?? 1;
        try {
          span.setStatus({ code, message: status.message });
        } catch {
          // ignore
        }
      }
      try {
        span.end();
      } catch {
        // ignore
      }
    }
  };
}

export async function startLlmSpan(name: string, attributes?: Record<string, unknown>): Promise<InstrumentedSpan> {
  if (!isTelemetryEnabled()) {
    return noopSpan;
  }

  maybeInitTelemetry();

  const api = await loadOtelApi();
  if (!api?.trace?.getTracer) {
    return noopSpan;
  }

  const tracer = api.trace.getTracer(process.env.OTEL_SERVICE_NAME || "umca-executor");
  const span = tracer?.startSpan(name, undefined, api.context?.active?.());
  if (!span) {
    return noopSpan;
  }

  const instrumented = createInstrumentedSpan(api, span);
  if (attributes) {
    instrumented.setAttributes(attributes);
  }
  return instrumented;
}
