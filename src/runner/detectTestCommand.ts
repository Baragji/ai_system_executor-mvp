import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  scripts?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
  dependencies?: Record<string, string | undefined>;
};

function readPackageJson(projectRoot: string): PackageJson | null {
  const packagePath = path.join(projectRoot, "package.json");
  try {
    const contents = fs.readFileSync(packagePath, "utf-8");
    return JSON.parse(contents) as PackageJson;
  } catch {
    return null;
  }
}

function hasDependency(pkg: PackageJson | null, name: string): boolean {
  if (!pkg) return false;
  return Boolean(pkg.devDependencies?.[name] ?? pkg.dependencies?.[name]);
}

export function detectTestCommand(projectRoot: string): string {
  const pkg = readPackageJson(projectRoot);
  const script = pkg?.scripts?.test?.trim();
  if (script) {
    return "npm test";
  }

  if (hasDependency(pkg, "vitest")) {
    return "vitest run";
  }

  if (hasDependency(pkg, "jest")) {
    return "jest";
  }

  return "node --test";
}
