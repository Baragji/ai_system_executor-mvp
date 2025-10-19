import { randomUUID } from "node:crypto";

import { context, propagation } from "@opentelemetry/api";

type FetchFunction = typeof fetch;
type FetchInput = Parameters<FetchFunction>[0];
type RequestInitLike = FetchFunction extends (
  input: FetchInput,
  init?: infer Init,
) => Promise<Response>
  ? NonNullable<Init>
  : Record<string, never>;
type HeadersInitLike = RequestInitLike extends { headers?: infer HeadersInitType }
  ? HeadersInitType
  : Record<string, string>;

type NormalizedHeaders = Headers;

function getFirstHeaderValue(value: string | string[] | null): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function ensureCorrelationId(headers: NormalizedHeaders): string {
  const existing = getFirstHeaderValue(headers.get("x-correlation-id"));
  if (existing) {
    return existing;
  }

  const correlationId = randomUUID();
  headers.set("x-correlation-id", correlationId);
  return correlationId;
}

function injectTraceHeaders(headers: NormalizedHeaders): void {
  const activeContext = context.active();
  const carrier: Record<string, string> = {};

  propagation.inject(activeContext, carrier);

  for (const [key, value] of Object.entries(carrier)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
}

export type FetchJsonOptions = RequestInitLike;

function normalizeHeaders(headers: HeadersInitLike | undefined): NormalizedHeaders {
  if (headers instanceof Headers) {
    return new Headers(headers);
  }

  return new Headers(headers ?? {});
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return contentType ? contentType.includes("application/json") : false;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  if (isJsonResponse(response)) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function fetchJson<T = unknown>(
  input: FetchInput,
  options: FetchJsonOptions = {} as FetchJsonOptions,
): Promise<T> {
  const { headers: incomingHeaders, ...rest } = options as FetchJsonOptions & {
    headers?: HeadersInitLike;
  };

  const headers = normalizeHeaders(incomingHeaders);

  ensureCorrelationId(headers);
  injectTraceHeaders(headers);

  const response = await fetch(input, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(
      `Request to ${typeof input === "string" ? input : response.url} failed with status ${response.status}`,
    );

    (error as Error & { response: Response }).response = response;
    (error as Error & { body: string }).body = errorBody;
    throw error;
  }

  return parseResponse<T>(response);
}
