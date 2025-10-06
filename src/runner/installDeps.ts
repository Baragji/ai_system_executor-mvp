import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const INSTALL_ARGS = ["ci", "--ignore-scripts"];
const DEFAULT_TIMEOUT_MS = 120_000;

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

function buildCommandString(): string {
  return `npm ${INSTALL_ARGS.join(" ")}`;
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
  if (hasNodeModules) {
    return { installed: false, command: null };
  }

  const hasLockfile =
    (await pathExists(path.join(projectRoot, "package-lock.json"))) ||
    (await pathExists(path.join(projectRoot, "npm-shrinkwrap.json")));
  if (!hasLockfile) {
    return { installed: false, command: null };
  }

  await fs.mkdir(projectRoot, { recursive: true });
  const child = spawn("npm", INSTALL_ARGS, {
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

  const { code } = await new Promise<{ code: number | null }>((resolve, reject) => {
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
    const output = stderr.trim() || stdout.trim();
    throw new Error(
      `Dependency installation failed with code ${code ?? "null"}. ${output || "No output"}`
    );
  }

  return {
    installed: true,
    command: buildCommandString(),
    stdout,
    stderr
  };
}
