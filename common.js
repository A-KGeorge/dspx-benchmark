/**
 * Common utilities for dspx benchmarks
 */
import os from "node:os";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INPUT_SIZES = [
  { name: "small", length: 1024, desc: "Fits in L1 cache" },
  { name: "medium", length: 65536, desc: "Fits in L3 cache" },
  { name: "large", length: 1048576, desc: "Main-memory scale" },
];

/**
 * Generate a test signal (sine wave)
 */
export function genSignal(n, freq = 50, fs = 10000) {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = Math.sin((2 * Math.PI * freq * i) / fs);
  }
  return x;
}

/**
 * Generate timestamps for samples
 */
export function genTimestamps(n, fs = 10000) {
  const timestamps = new Float32Array(n);
  const startTime = Date.now();
  const intervalMs = 1000 / fs;

  for (let i = 0; i < n; i++) {
    timestamps[i] = startTime + i * intervalMs;
  }
  return timestamps;
}

/**
 * Get machine specifications
 */
export function getMachineSpecs() {
  const cpus = os.cpus();
  const cpu = cpus[0]?.model || "Unknown";
  const cores = cpus.length;
  const ram = (os.totalmem() / 1024 ** 3).toFixed(0) + " GB";
  const arch = process.arch;

  let osName = os.platform();
  if (osName === "win32") {
    try {
      const ver = execSync("ver", { encoding: "utf-8" });
      osName = ver.trim().replace(/\r?\n/g, " ");
    } catch {
      osName = `Windows ${os.release()}`;
    }
  } else {
    osName = `${os.platform()} ${os.release()}`;
  }

  const nodeVer = process.version;

  let dspxVer = "unknown";
  try {
    const pkgPath = path.join(
      __dirname,
      "node_modules",
      "dspx",
      "package.json"
    );
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    dspxVer = pkg.version;
  } catch (e) {
    console.warn("Could not read dspx version:", e.message);
  }

  return {
    cpu,
    cores,
    ram,
    arch,
    os: osName,
    node: nodeVer,
    dspx: dspxVer,
  };
}

/**
 * Run a benchmark with warmup and multiple repetitions
 */
export async function runTimed(name, fn, warmups = 2, reps = 5) {
  // Warmup runs
  for (let i = 0; i < warmups; i++) {
    await fn();
  }

  // Actual benchmark runs
  const times = [];
  const memBefore = process.memoryUsage().heapUsed;

  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }

  const memAfter = process.memoryUsage().heapUsed;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p99 = max; // With small samples, max is essentially p99

  return {
    avg,
    min,
    max,
    p99,
    rss: process.memoryUsage().rss,
    heapUsed: memAfter - memBefore,
    times,
  };
}

/**
 * Sanitize CPU name for use as directory name
 */
function sanitizeCpuName(cpuName) {
  return cpuName
    .replace(/\(R\)/g, "")
    .replace(/\(TM\)/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
    .replace(/-+/g, "-") // Replace multiple dashes with single dash
    .toLowerCase();
}

/**
 * Get platform identifier from environment variable or auto-detect
 * Now uses CPU name instead of architecture
 */
export function getPlatformId() {
  // Check if user set a custom platform identifier
  if (process.env.BENCHMARK_PLATFORM) {
    return process.env.BENCHMARK_PLATFORM;
  }

  // Auto-detect: use sanitized CPU name
  const cpus = os.cpus();
  const cpuName = cpus[0]?.model || "unknown-cpu";
  return sanitizeCpuName(cpuName);
}

/**
 * Load TensorFlow.js with appropriate backend for the platform
 * Returns null if TensorFlow is not available/needed for the current platform
 */
export async function loadTensorFlow() {
  const platformId = getPlatformId();

  try {
    // For linux-arm64, use WASM backend
    if (platformId === "linux-arm64" || platformId.includes("linux-arm64")) {
      console.log(
        "⚙️  Loading TensorFlow.js with WASM backend (linux-arm64)..."
      );
      const tf = await import("@tensorflow/tfjs");
      const wasm = await import("@tensorflow/tfjs-backend-wasm");

      // Set WASM backend
      wasm.setWasmPaths(
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@latest/dist/"
      );
      await tf.setBackend("wasm");
      await tf.ready();

      console.log(`✓ TensorFlow.js WASM backend ready\n`);
      return tf;
    } else {
      // For other platforms, use tfjs-node (native bindings)
      console.log("⚙️  Loading TensorFlow.js with Node backend...");
      const tf = await import("@tensorflow/tfjs-node");
      await tf.ready();
      console.log(`✓ TensorFlow.js Node backend ready\n`);
      return tf;
    }
  } catch (e) {
    console.warn(`⚠️  Could not load TensorFlow.js: ${e.message}`);
    console.warn("   TensorFlow.js benchmarks will be skipped.\n");
    return null;
  }
}

/**
 * Save JSON results (with optional platform-specific subdirectory)
 */
export function saveJSON(file, data, usePlatformDir = true) {
  const platformId = usePlatformDir ? getPlatformId() : null;
  const resultsDir = platformId
    ? path.join(__dirname, "results", platformId)
    : path.join(__dirname, "results");

  fs.mkdirSync(resultsDir, { recursive: true });
  const filePath = path.join(resultsDir, `${file}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`📊 Results saved to: ${filePath}`);
}

/**
 * Load JSON results (with optional platform-specific subdirectory)
 */
export function loadJSON(file, usePlatformDir = true) {
  const platformId = usePlatformDir ? getPlatformId() : null;
  const filePath = platformId
    ? path.join(__dirname, "results", platformId, `${file}.json`)
    : path.join(__dirname, "results", `${file}.json`);

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.warn(`Could not load ${file}.json:`, e.message);
    return null;
  }
}

/**
 * Format throughput for display
 */
export function formatThroughput(samples, avgMs) {
  const samplesPerSec = (samples / avgMs) * 1000;
  if (samplesPerSec >= 1e6) {
    return `${(samplesPerSec / 1e6).toFixed(2)}M samples/sec`;
  } else if (samplesPerSec >= 1e3) {
    return `${(samplesPerSec / 1e3).toFixed(2)}K samples/sec`;
  } else {
    return `${samplesPerSec.toFixed(2)} samples/sec`;
  }
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  } else if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${bytes} B`;
  }
}

/**
 * Print a benchmark result
 */
export function printResult(result) {
  console.log(
    `\n📈 ${result.test} - ${
      result.input
    } (${result.samples.toLocaleString()} samples)`
  );
  console.log(`   Library: ${result.lib}`);
  console.log(`   Avg time: ${result.avg_ms.toFixed(2)} ms`);
  console.log(
    `   Throughput: ${formatThroughput(result.samples, result.avg_ms)}`
  );
  if (result.backend) {
    console.log(`   Backend: ${result.backend}`);
  }
}

/**
 * Create directories if they don't exist
 */
export function ensureDirs() {
  const dirs = ["results", "charts"];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get a summary line for console output
 */
export function getSummaryLine(results) {
  const byLib = {};

  for (const r of results) {
    if (!byLib[r.lib]) byLib[r.lib] = [];
    byLib[r.lib].push(r);
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  for (const [lib, libResults] of Object.entries(byLib)) {
    const avgThroughput =
      libResults.reduce((sum, r) => {
        return sum + (r.samples / r.avg_ms) * 1000;
      }, 0) / libResults.length;

    console.log(
      `${lib.padEnd(20)} → ${formatThroughput(1000, 1000 / avgThroughput)}`
    );
  }
  console.log("=".repeat(80) + "\n");
}
