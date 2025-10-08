export function sanitizeExecutorOutput(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const invalidStart = /^([/]|[A-Za-z]:|\.{1,2}|\\)/;

  if (typeof obj.project_name === "string") {
    out.project_name = obj.project_name;
  }

  if (Array.isArray(obj.files)) {
    const files = obj.files
      .map((f: unknown) => {
        if (!f || typeof f !== "object") return null;
        const fo = f as Record<string, unknown>;
        const rawPath = typeof fo.path === "string" ? fo.path : null;
        const rawContents = typeof fo.contents === "string" ? fo.contents : null;
        if (!rawPath || !rawContents) return null;
        const normalizedPath = rawPath.replace(/^(?:\.\/)+/, "");
        if (invalidStart.test(normalizedPath)) return null;
        return { path: normalizedPath, contents: rawContents };
      })
      .filter((f: unknown) => !!f);
    if (files.length > 0) {
      out.files = files as unknown[];
    }
  }

  if (Array.isArray(obj.notes)) {
    out.notes = (obj.notes as unknown[]).filter(n => typeof n === "string");
  }

  if (Array.isArray(out.files)) {
    const files = out.files as { path: string; contents: string }[];
    const hasTestFiles = files.some(f =>
      /(^|\/)__(tests)__\//.test(f.path) ||
      /(^|\/)tests\//.test(f.path) ||
      /\.test\.[tj]s$/.test(f.path)
    );
    let hasTestsFlag: boolean | undefined = typeof obj.hasTests === "boolean" ? (obj.hasTests as boolean) : undefined;
    if (hasTestFiles) {
      hasTestsFlag = true;
    } else if (hasTestsFlag === undefined) {
      hasTestsFlag = false;
    }
    out.hasTests = hasTestsFlag;
  } else if (typeof obj.hasTests === "boolean") {
    out.hasTests = obj.hasTests as boolean;
  }

  if (typeof obj.notes === "string") {
    out.notes = [obj.notes];
  }

  return out;
}
