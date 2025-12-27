#!/usr/bin/env node

/**
 * Wrapper to run Python benchmarks with correct platform
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptName = process.argv[2];
const platform = process.env.BENCHMARK_PLATFORM || "";

const pythonScript = join(__dirname, "..", "benchmarks", scriptName + ".py");

const args = platform ? [pythonScript, platform] : [pythonScript];

const python = spawn("python", args, {
  stdio: "inherit",
  cwd: join(__dirname, ".."),
  env: {
    ...process.env,
    BENCHMARK_PLATFORM: process.env.BENCHMARK_PLATFORM || "",
  },
});

python.on("close", (code) => {
  process.exit(code);
});

python.on("error", (err) => {
  console.error("Failed to start Python process:", err);
  process.exit(1);
});
