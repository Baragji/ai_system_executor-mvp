declare module "@opentelemetry/sdk-node" {
  export class NodeSDK {
    constructor(options?: Record<string, unknown>);
    start(): Promise<void> | void;
    shutdown(): Promise<void>;
  }
}

declare module "@opentelemetry/exporter-trace-otlp-http" {
  export class OTLPTraceExporter {
    constructor(options?: Record<string, unknown>);
  }
}

declare module "@opentelemetry/instrumentation-http" {
  export class HttpInstrumentation {
    constructor(options?: Record<string, unknown>);
  }
}

declare module "@opentelemetry/resources" {
  export function defaultResource(): {
    merge(resource: unknown): unknown;
  };
  export function resourceFromAttributes(attributes: Record<string, unknown>): unknown;
}

declare module "@opentelemetry/semantic-conventions" {
  export const SemanticResourceAttributes: {
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
    [key: string]: string;
  };
}
