// src/utils/curlFetch.ts
import { execFile } from "node:child_process";
import { TextEncoder } from "node:util";

interface FetchInit {
  method?: string;
  headers?: Record<string, string> | [string, string][] | Headers;
  body?: string | Uint8Array | Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function headersToCurlArgs(headers: FetchInit["headers"] | undefined): string[] {
  const args: string[] = [];
  if (!headers) return args;
  const h = new Headers(headers as Record<string, string> | [string, string][]);
  for (const [k, v] of h.entries()) args.push("-H", `${k}: ${v}`);
  return args;
}

export async function curlFetch(input: string | URL, init: FetchInit = {}): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  const method = (init.method || "GET").toUpperCase();

  const args = [
    "-sS",               // silent but show errors
    "-L",                // follow redirects
    "-X", method,
    url,
    "--connect-timeout", (init.timeoutMs ? Math.ceil(init.timeoutMs/1000) : 10).toString(),
    "--max-time", (init.timeoutMs ? Math.ceil(init.timeoutMs/1000) : 300).toString(),
  ];

  // headers
  args.push(...headersToCurlArgs(init.headers));

  // body
  if (init.body != null) {
    let bodyStr: string;
    if (typeof init.body === "string") {
      bodyStr = init.body;
    } else if (init.body instanceof Uint8Array) {
      bodyStr = Buffer.from(init.body).toString("utf8");
    } else if (typeof (init.body as { text?: () => Promise<string> }).text === "function") {
      bodyStr = await (init.body as { text: () => Promise<string> }).text();
    } else {
      bodyStr = JSON.stringify(init.body);
    }
    args.push("--data-binary", bodyStr);
  }

  // capture headers separately
  args.push("-i"); // include headers in output

  const stdout = await new Promise<string>((resolve, reject) => {
    execFile("curl", args, { maxBuffer: 20 * 1024 * 1024 }, (err, out, errout) => {
      if (err) reject(new Error(errout || err.message));
      else resolve(out as string);
    });
  });

  // split headers and body at the last header block
  const parts = stdout.split(/\r?\n\r?\n/);
  let headerBlock = "";
  let body = "";
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i]!;
    if (/^HTTP\/\d+\.\d+\s+\d+/.test(chunk)) headerBlock = chunk; // start of a header block
    else if (headerBlock) { body = parts.slice(i).join("\n\n"); break; }
  }

  const statusMatch = headerBlock.match(/^HTTP\/\d\.\d\s+(\d+)\s*(.*)$/m);
  const status = statusMatch ? parseInt(statusMatch[1]!, 10) : 200;
  const statusText = statusMatch ? statusMatch[2] || "" : "";

  const headers = new Headers();
  headerBlock.split(/\r?\n/).slice(1).forEach(line => {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) headers.append(k, v);
    }
  });

  const encoder = new TextEncoder();
  const bodyBuf = encoder.encode(body);
  const res = new Response(bodyBuf, { status, statusText, headers });
  return res;
}
