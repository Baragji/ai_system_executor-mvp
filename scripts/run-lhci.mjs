#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const chromeBinary = process.env.PLAYWRIGHT_CHROME ?? chromium.executablePath();
const chromeFlags = ["--disable-dev-shm-usage", "--headless=new"];
const wrapperPath = fileURLToPath(new URL("./chrome-with-flags.sh", import.meta.url));
const env = {
  ...process.env,
  CHROME_PATH: wrapperPath,
  LHCI_COLLECT__CHROME_PATH: wrapperPath,
  PLAYWRIGHT_CHROME: chromeBinary,
};

const binUrl = new URL(
  process.platform === "win32"
    ? "../node_modules/.bin/lhci.cmd"
    : "../node_modules/.bin/lhci",
  import.meta.url,
);
const lhciBin = fileURLToPath(binUrl);

const args = [
  "autorun",
  "--static-dist-dir=",
  "--config=lighthouserc.js",
  `--chrome-path=${wrapperPath}`,
  `--chrome-flags=${chromeFlags.join(" ")}`,
];

const child = spawn(lhciBin, args, {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to launch Lighthouse CI:", error);
  process.exit(1);
});
