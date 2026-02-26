/**
 * Debug parallel processing to understand performance issue
 */
import { DspThreadPool, isParallelAvailable } from "../lib/parallel.js";
import { performance } from "node:perf_hooks";

function genSignal(length, freq, sampleRate) {
  const signal = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    signal[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return signal;
}

console.log("🔍 Debugging Parallel FIR Processing\n");

const check = isParallelAvailable();
if (!check.available) {
  console.log(`❌ Parallel processing not available: ${check.reason}`);
  process.exit(1);
}

console.log(`✓ Using ${check.maxThreads} worker threads\n`);

// Create batch of 10 signals
const BATCH_SIZE = 10;
const SIGNAL_LENGTH = 65536;
const signals = [];
for (let i = 0; i < BATCH_SIZE; i++) {
  signals.push(genSignal(SIGNAL_LENGTH, 50, 10000));
}

const filterConfig = {
  type: "fir",
  mode: "lowpass",
  cutoffFrequency: 2000,
  sampleRate: 10000,
  order: 51,
  windowType: "hamming",
};

const pool = new DspThreadPool(check.maxThreads);

console.log("📊 Initializing worker pool...\n");
console.time("Init time");
await pool.init({ filterConfig });
console.timeEnd("Init time");

console.log("✓ Worker pool initialized\n");
console.log("📊 Processing batch of 10 signals (65,536 samples each)...\n");

console.time("Total time");
const t0 = performance.now();

const results = await pool.processFirFilterParallel(
  signals,
  filterConfig,
  10000,
);

const elapsed = performance.now() - t0;
console.timeEnd("Total time");

await pool.terminate();

console.log(`\n✓ Completed in ${elapsed.toFixed(2)} ms`);
console.log(`✓ Output: ${results.length} signals`);
console.log(`✓ Each signal: ${results[0].length} samples`);
console.log(`✓ Total samples: ${BATCH_SIZE * SIGNAL_LENGTH}`);
console.log(
  `✓ Throughput: ${((((BATCH_SIZE * SIGNAL_LENGTH) / elapsed) * 1000) / 1e6).toFixed(2)}M samples/sec`,
);
console.log(`\nExpected: ~2ms for parallel processing (vs ~19ms sequential)`);
console.log(`Actual: ${elapsed.toFixed(2)}ms`);
if (elapsed < 10) {
  console.log("✅ GOOD performance!");
} else {
  console.log("⚠️  SLOW performance detected!");
}
