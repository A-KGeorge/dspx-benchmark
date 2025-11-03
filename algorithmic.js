/**
 * Story 2 — Algorithmic Efficiency (O(1) vs O(N))
 *
 * Demonstrates constant-time scaling for dspx.MovingAverage() vs naive JS loop
 */

import { createDspPipeline } from "dspx";
import {
  INPUT_SIZES,
  genSignal,
  getMachineSpecs,
  runTimed,
  saveJSON,
  ensureDirs,
} from "./common.js";

ensureDirs();

console.log("🚀 Story 2 — Algorithmic Efficiency (O(1) vs O(N·W))\n");

const specs = getMachineSpecs();
console.log("Machine Specs:");
console.log(`  CPU: ${specs.cpu}`);
console.log(`  Node: ${specs.node}`);
console.log(`  dspx: ${specs.dspx}\n`);

const WINDOW_SIZES = [32, 128, 512, 2048, 8192];
const results = [];

console.log("=".repeat(80));
console.log("MOVING AVERAGE: Window Size Scaling");
console.log("=".repeat(80));
console.log("\nExpected patterns:");
console.log("  • dspx (circular buffer): O(1) — flat line");
console.log(
  "  • naive JS (sliding window): O(N·W) — increasing with window size\n"
);

// Naive JavaScript implementation
function naiveMovingAverage(signal, windowSize) {
  const output = new Float32Array(signal.length);

  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      sum += signal[j];
      count++;
    }

    output[i] = sum / count;
  }

  return output;
}

for (const size of INPUT_SIZES) {
  const signal = genSignal(size.length, 50, 10000);

  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `Input: ${size.name.toUpperCase()} (${size.length.toLocaleString()} samples)`
  );
  console.log("=".repeat(80));

  for (const windowSize of WINDOW_SIZES) {
    console.log(`\n🔬 Window size: ${windowSize}`);

    // --- dspx Moving Average (O(1) circular buffer) ---
    try {
      const pipeline = createDspPipeline();
      pipeline.MovingAverage({ mode: "moving", windowSize });

      const result = await runTimed(
        `dspx-ma-${windowSize}`,
        async () => {
          return await pipeline.process(signal, {
            sampleRate: 10000,
            channels: 1,
          });
        },
        2,
        5
      );

      const data = {
        test: "moving_average",
        input: size.name,
        samples: size.length,
        windowSize,
        lib: "dspx",
        impl: "circular_buffer_O1",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (size.length / result.avg) * 1000,
        meta: specs,
      };

      results.push(data);
      console.log(`   dspx (O(1)):       ${result.avg.toFixed(3)} ms`);
    } catch (e) {
      console.error(`   ❌ dspx failed:`, e.message);
    }

    // --- Naive JS Moving Average (O(N·W)) ---
    // Only run for smaller inputs to avoid extremely long execution times
    if (size.length <= 65536 || windowSize <= 512) {
      try {
        const result = await runTimed(
          `naive-ma-${windowSize}`,
          () => {
            return naiveMovingAverage(signal, windowSize);
          },
          2,
          5
        );

        const data = {
          test: "moving_average",
          input: size.name,
          samples: size.length,
          windowSize,
          lib: "naive_js",
          impl: "sliding_window_ONW",
          avg_ms: result.avg,
          min_ms: result.min,
          max_ms: result.max,
          throughput: (size.length / result.avg) * 1000,
          meta: specs,
        };

        results.push(data);
        console.log(`   naive JS (O(N·W)): ${result.avg.toFixed(3)} ms`);

        // Calculate speedup
        const dspxResult = results.find(
          (r) =>
            r.lib === "dspx" &&
            r.windowSize === windowSize &&
            r.input === size.name
        );
        if (dspxResult) {
          const speedup = result.avg / dspxResult.avg_ms;
          console.log(`   ⚡ Speedup: ${speedup.toFixed(2)}x faster with dspx`);
        }
      } catch (e) {
        console.error(`   ❌ naive JS failed:`, e.message);
      }
    } else {
      console.log(`   naive JS (O(N·W)): ⏭️  skipped (would take too long)`);
    }
  }
}

// Save results
saveJSON("algorithmic", results);

// Print summary
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));

const dspxAvg =
  results
    .filter((r) => r.lib === "dspx")
    .reduce((sum, r) => sum + r.avg_ms, 0) /
  results.filter((r) => r.lib === "dspx").length;

const naiveAvg =
  results
    .filter((r) => r.lib === "naive_js")
    .reduce((sum, r) => sum + r.avg_ms, 0) /
  results.filter((r) => r.lib === "naive_js").length;

console.log(
  `\ndspx (O(1) circular buffer):   ${dspxAvg.toFixed(2)} ms average`
);
console.log(`naive JS (O(N·W) sliding):     ${naiveAvg.toFixed(2)} ms average`);
console.log(
  `Overall speedup:                ${(naiveAvg / dspxAvg).toFixed(2)}x\n`
);

console.log(
  "Key insight: dspx maintains constant time regardless of window size,"
);
console.log("while naive implementation scales linearly with window size.\n");

console.log("✅ Algorithmic benchmarks complete!\n");
