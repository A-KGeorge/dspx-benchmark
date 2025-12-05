/**
 * Story 4 — Production Logging (TopicRouter + Batching)
 *
 * Demonstrates throughput impact of different logging modes
 */

import { createDspPipeline, TopicRouter, createConsoleHandler } from "dspx";
import {
  INPUT_SIZES,
  genSignal,
  getMachineSpecs,
  runTimed,
  saveJSON,
  ensureDirs,
  formatThroughput,
} from "../lib/common.js";

ensureDirs();

console.log("🚀 Story 4 — Production Logging (TopicRouter + Batching)\n");

const specs = getMachineSpecs();
console.log("Machine Specs:");
console.log(`  CPU: ${specs.cpu}`);
console.log(`  Node: ${specs.node}`);
console.log(`  dspx: ${specs.dspx}\n`);

const results = [];

console.log("=".repeat(80));
console.log("LOGGING MODE COMPARISON");
console.log("=".repeat(80));
console.log("\nModes tested:");
console.log("  • none:    No logging (baseline)");
console.log("  • batched: onLogBatch with TopicRouter (recommended)");
console.log("  • per:     Per-message callback (not recommended)");
console.log("  • console: Naive console.log (anti-pattern)\n");

// Test with medium and large inputs only
const testSizes = INPUT_SIZES.filter((s) => s.name !== "small");

for (const size of testSizes) {
  const signal = genSignal(size.length, 50, 10000);

  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `Input: ${size.name.toUpperCase()} (${size.length.toLocaleString()} samples)`
  );
  console.log("=".repeat(80));

  // --- Mode 1: No Logging (Baseline) ---
  console.log("\n🔬 Mode: none (baseline)");
  try {
    const pipeline = createDspPipeline();
    pipeline.MovingAverage({ mode: "moving", windowSize: 100 });

    const result = await runTimed(
      "no-logging",
      async () => {
        return await pipeline.process(signal, {
          sampleRate: 10000,
          channels: 1,
        });
      },
      3,
      10
    );

    const throughput = (size.length / result.avg) * 1000;

    const data = {
      test: "logging",
      input: size.name,
      samples: size.length,
      mode: "none",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput,
      overhead_percent: 0,
      meta: specs,
    };

    results.push(data);
    console.log(`   Time: ${result.avg.toFixed(2)} ms`);
    console.log(`   Throughput: ${formatThroughput(size.length, result.avg)}`);

    // Dispose pipeline
    pipeline.dispose();
  } catch (e) {
    console.error("   ❌ Failed:", e.message);
  }

  // --- Mode 2: Batched Logging with TopicRouter ---
  console.log("\n🔬 Mode: batched (TopicRouter + onLogBatch)");
  try {
    let logCount = 0;
    const router = new TopicRouter();

    // Route errors to one handler, everything else to another
    // Note: Use addRoute() with RegExp patterns, not subscribe()
    router.addRoute(/\.error$/, (log) => {
      logCount++;
      // In production: send to PagerDuty
    });

    router.addRoute(/.*/, (log) => {
      logCount++;
      // In production: send to Loki
    });

    const pipeline = createDspPipeline();
    pipeline.MovingAverage({ mode: "moving", windowSize: 100 });

    const result = await runTimed(
      "batched-logging",
      async () => {
        return await pipeline.process(signal, {
          sampleRate: 10000,
          channels: 1,
          callbacks: {
            onLogBatch: (logs) => {
              // Route each log entry to matching handlers
              logs.forEach((log) => router.route(log));
            },
          },
        });
      },
      3,
      10
    );

    const throughput = (size.length / result.avg) * 1000;
    const baselineResult = results.find(
      (r) => r.input === size.name && r.mode === "none"
    );
    const overhead = baselineResult
      ? ((result.avg - baselineResult.avg_ms) / baselineResult.avg_ms) * 100
      : 0;

    const data = {
      test: "logging",
      input: size.name,
      samples: size.length,
      mode: "batched",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput,
      overhead_percent: overhead,
      log_count: logCount,
      meta: specs,
    };

    results.push(data);
    console.log(`   Time: ${result.avg.toFixed(2)} ms`);
    console.log(`   Throughput: ${formatThroughput(size.length, result.avg)}`);
    console.log(`   Overhead: ${overhead.toFixed(2)}%`);
    console.log(`   Logs captured: ${logCount}`);

    // Dispose pipeline
    pipeline.dispose();
  } catch (e) {
    console.error("   ❌ Failed:", e.message);
  }

  // --- Mode 3: Per-Message Callback ---
  console.log("\n🔬 Mode: per-message (onLog callback)");
  try {
    let logCount = 0;

    const pipeline = createDspPipeline();
    pipeline.MovingAverage({ mode: "moving", windowSize: 100 });

    const result = await runTimed(
      "per-message-logging",
      async () => {
        return await pipeline.process(signal, {
          sampleRate: 10000,
          channels: 1,
          callbacks: {
            onLog: (topic, level, message, context) => {
              logCount++;
              // Do nothing - just counting
            },
          },
        });
      },
      3,
      10
    );

    const throughput = (size.length / result.avg) * 1000;
    const baselineResult = results.find(
      (r) => r.input === size.name && r.mode === "none"
    );
    const overhead = baselineResult
      ? ((result.avg - baselineResult.avg_ms) / baselineResult.avg_ms) * 100
      : 0;

    const data = {
      test: "logging",
      input: size.name,
      samples: size.length,
      mode: "per-message",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput,
      overhead_percent: overhead,
      log_count: logCount,
      meta: specs,
    };

    results.push(data);
    console.log(`   Time: ${result.avg.toFixed(2)} ms`);
    console.log(`   Throughput: ${formatThroughput(size.length, result.avg)}`);
    console.log(`   Overhead: ${overhead.toFixed(2)}%`);
    console.log(`   Logs captured: ${logCount}`);

    // Dispose pipeline
    pipeline.dispose();
  } catch (e) {
    console.error("   ❌ Failed:", e.message);
  }

  // --- Mode 4: Console.log (Anti-pattern) ---
  // Only run for medium size to avoid console spam
  if (size.name === "medium") {
    console.log("\n🔬 Mode: console (naive console.log - DO NOT USE)");
    try {
      let logCount = 0;

      const pipeline = createDspPipeline();
      pipeline.MovingAverage({ mode: "moving", windowSize: 100 });

      // Suppress console output during benchmark
      const originalLog = console.log;
      console.log = () => {};

      const result = await runTimed(
        "console-logging",
        async () => {
          return await pipeline.process(signal, {
            sampleRate: 10000,
            channels: 1,
            callbacks: {
              onLog: (topic, level, message, context) => {
                logCount++;
                originalLog(`[${level}] ${topic}: ${message}`);
              },
            },
          });
        },
        2,
        5
      );

      // Restore console.log
      console.log = originalLog;

      const throughput = (size.length / result.avg) * 1000;
      const baselineResult = results.find(
        (r) => r.input === size.name && r.mode === "none"
      );
      const overhead = baselineResult
        ? ((result.avg - baselineResult.avg_ms) / baselineResult.avg_ms) * 100
        : 0;

      const data = {
        test: "logging",
        input: size.name,
        samples: size.length,
        mode: "console",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput,
        overhead_percent: overhead,
        log_count: logCount,
        meta: specs,
      };

      results.push(data);
      console.log(`   Time: ${result.avg.toFixed(2)} ms`);
      console.log(
        `   Throughput: ${formatThroughput(size.length, result.avg)}`
      );
      console.log(`   Overhead: ${overhead.toFixed(2)}%`);
      console.log(`   Logs captured: ${logCount}`);

      // Dispose pipeline
      pipeline.dispose();
    } catch (e) {
      console.error("   ❌ Failed:", e.message);
    }
  }
}

// Save results
saveJSON("logging", results);

// Summary
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));

const modes = ["none", "batched", "per-message", "console"];
const summary = {};

for (const mode of modes) {
  const modeResults = results.filter((r) => r.mode === mode);
  if (modeResults.length > 0) {
    const avgOverhead =
      modeResults
        .filter((r) => r.overhead_percent !== undefined)
        .reduce((sum, r) => sum + r.overhead_percent, 0) /
      modeResults.filter((r) => r.overhead_percent !== undefined).length;

    const avgThroughput =
      modeResults.reduce((sum, r) => sum + r.throughput, 0) /
      modeResults.length;

    summary[mode] = { avgOverhead, avgThroughput };
  }
}

console.log("\nAverage Overhead vs Baseline:");
for (const [mode, data] of Object.entries(summary)) {
  if (mode !== "none") {
    console.log(
      `  ${mode.padEnd(15)}: ${data.avgOverhead.toFixed(2)}% overhead`
    );
  }
}

console.log("\nRecommendation:");
console.log("  ✅ Use 'batched' mode (onLogBatch + TopicRouter)");
console.log("     - Minimal overhead (<5% typical)");
console.log("     - Non-blocking");
console.log("     - Production-safe at high throughput");
console.log("\n  ❌ Avoid 'per-message' and 'console' modes");
console.log("     - High overhead (>20%)");
console.log("     - Blocks event loop");
console.log("     - Not suitable for production\n");

console.log("✅ Story 4 benchmarks complete!\n");
