import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { validateDependencies } from "../validation/dependencyPreflight.js";

const CI_INSTALL_ARGS = ["ci", "--ignore-scripts"];
const NPM_INSTALL_ARGS = ["install", "--ignore-scripts", "--no-audit", "--fund=false"];
const DEFAULT_TIMEOUT_MS = 120_000;

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

function buildCommandString(args: string[]): string {
  return `npm ${args.join(" ")}`;
}

export interface EnsureDependenciesResult {
  installed: boolean;
  command: string | null;
  stdout?: string;
  stderr?: string;
}

export async function ensureDependencies(
  projectRoot: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<EnsureDependenciesResult> {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const nodeModulesPath = path.join(projectRoot, "node_modules");

  const hasPackageJson = await pathExists(packageJsonPath);
  if (!hasPackageJson) {
    return { installed: false, command: null };
  }

  const hasNodeModules = await pathExists(nodeModulesPath);

  // Determine if declared deps are missing from node_modules (e.g., subtasks added new deps)
  let missingDeps: string[] = [];
  let allDepsCount = 0;
  try {
    const pkgRaw = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgRaw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {})
    ];
    allDepsCount = allDeps.length;
    
    // Validate dependencies before attempting install (fail-fast on invalid versions)
    if (allDeps.length > 0) {
      await validateDependencies(pkg.dependencies, pkg.devDependencies);
    }
    
    if (allDeps.length > 0) {
      const checks = await Promise.all(
        allDeps.map(async (name) => {
          const depPath = path.join(nodeModulesPath, name);
          return (await pathExists(depPath)) ? null : name;
        })
      );
      missingDeps = checks.filter((n): n is string => Boolean(n));
    }
  } catch (err) {
    // Re-throw validation errors (DependencyPreflightError)
    if (err && typeof err === "object" && "name" in err && err.name === "DependencyPreflightError") {
      throw err;
    }
    // ignore other parse errors; fall back to node_modules heuristic
  }

  // If there are no declared dependencies at all, skip installation even if node_modules is missing
  const needsInstall = (allDepsCount > 0) && (!hasNodeModules || missingDeps.length > 0);

  // Determine strategy: prefer reproducible CI when a lockfile exists
  const hasLockfile =
    (await pathExists(path.join(projectRoot, "package-lock.json"))) ||
    (await pathExists(path.join(projectRoot, "npm-shrinkwrap.json")));
  if (!needsInstall) {
    return { installed: false, command: null };
  }

  await fs.mkdir(projectRoot, { recursive: true });
  let args = hasLockfile ? CI_INSTALL_ARGS : NPM_INSTALL_ARGS;
  let child = spawn("npm", args, {
    cwd: projectRoot,
    env: { ...process.env, CI: process.env.CI ?? "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", chunk => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", chunk => {
    stderr += chunk.toString();
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs).unref();

  let { code } = await new Promise<{ code: number | null }>((resolve, reject) => {
    child.once("error", err => {
      clearTimeout(timer);
      reject(err);
    });
    child.once("exit", (exitCode: number | null) => {
      clearTimeout(timer);
      resolve({ code: exitCode });
    });
  });

  if (timedOut) {
    throw new Error(
      `Dependency installation exceeded ${timeoutMs}ms. stderr: ${stderr.trim() || "<empty>"}`
    );
  }

  if (code !== 0) {
    const output = (stdout + "\n" + stderr).trim();
    const lockfileMismatch = /npm ci can only install packages|EUSAGE|Invalid: lock file|Missing: .* from lock file/i.test(output);
    if (hasLockfile && lockfileMismatch) {
      // Fallback to a standard install to update lockfile and proceed
      args = NPM_INSTALL_ARGS;
      stdout = "";
      stderr = "";
      timedOut = false;
      const fallback = spawn("npm", args, {
        cwd: projectRoot,
        env: { ...process.env, CI: process.env.CI ?? "1" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      const timer2 = setTimeout(() => {
        timedOut = true;
        fallback.kill("SIGKILL");
      }, timeoutMs).unref();
      fallback.stdout?.on("data", chunk => { stdout += chunk.toString(); });
      fallback.stderr?.on("data", chunk => { stderr += chunk.toString(); });
      ({ code } = await new Promise<{ code: number | null }>((resolve, reject) => {
        fallback.once("error", err => { clearTimeout(timer2); reject(err); });
        fallback.once("exit", (exitCode: number | null) => { clearTimeout(timer2); resolve({ code: exitCode }); });
      }));
      if (timedOut) {
        throw new Error(
          `Dependency installation (fallback) exceeded ${timeoutMs}ms. stderr: ${stderr.trim() || "<empty>"}`
        );
      }
      if (code !== 0) {
        const out2 = stderr.trim() || stdout.trim();
        throw new Error(
          `Dependency installation failed after fallback with code ${code ?? "null"}. ${out2 || "No output"}`
        );
      }
    } else {
      const out = stderr.trim() || stdout.trim();
      throw new Error(
        `Dependency installation failed with code ${code ?? "null"}. ${out || "No output"}`
      );
    }
  }

  return {
    installed: true,
    command: buildCommandString(args),
    stdout,
    stderr
  };
}
