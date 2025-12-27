#!/usr/bin/env node

/**
 * Wrapper to run Java benchmarks with correct platform
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const className = process.argv[2];
const platform = process.env.BENCHMARK_PLATFORM || "";

const mvnArgs = ["compile", "exec:java", `-Dexec.mainClass=${className}`];

if (platform) {
  mvnArgs.push(`-Dexec.args=${platform}`);
}

const mvn = spawn("mvn", mvnArgs, {
  stdio: "inherit",
  cwd: process.cwd(),
  env: { ...process.env, BENCHMARK_PLATFORM: platform },
});

mvn.on("close", (code) => {
  process.exit(code);
});

mvn.on("error", (err) => {
  console.error("Failed to start Maven process:", err);
  process.exit(1);
});
