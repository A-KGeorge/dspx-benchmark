/**
 * Profile parallel processing to find bottlenecks
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

console.log("🔍 Profiling Parallel Processing Bottlenecks\n");

const check = isParallelAvailable();
console.log(`✓ Using ${check.maxThreads} worker threads\n`);

// Test with just 2 signals and 2 workers to simplify
const NUM_WORKERS = 2;
const BATCH_SIZE = 2;
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

const pool = new DspThreadPool(NUM_WORKERS);

console.log("📊 Initializing pool...");
const t_init_start = performance.now();
await pool.init({ filterConfig });
const t_init_end = performance.now();
console.log(`✓ Init: ${(t_init_end - t_init_start).toFixed(2)}ms\n`);

console.log("📊 Processing...");
const t_start = performance.now();
const results = await pool.processFirFilterParallel(
  signals,
  filterConfig,
  10000,
);
const t_end = performance.now();

await pool.terminate();

console.log(`\n✓ Total processing: ${(t_end - t_start).toFixed(2)}ms`);
console.log(`✓ With ${NUM_WORKERS} workers processing ${BATCH_SIZE} signals`);
console.log(
  `✓ Expected: ~1.88ms (both signals processed in parallel by 2 workers)`,
);
console.log(`✓ Actual: ${(t_end - t_start).toFixed(2)}ms`);

// Single-threaded baseline
console.log(`\n📊 Single-threaded baseline for comparison...`);
import { createDspPipeline } from "dspx";
const pipeline = createDspPipeline();
pipeline.filter(filterConfig);

const t_single_start = performance.now();
for (let i = 0; i < BATCH_SIZE; i++) {
  pipeline.processSync(signals[i], { sampleRate: 10000, channels: 1 });
}
const t_single_end = performance.now();

console.log(
  `✓ Single-threaded: ${(t_single_end - t_single_start).toFixed(2)}ms for ${BATCH_SIZE} signals`,
);
console.log(
  `✓ Speedup: ${((t_single_end - t_single_start) / (t_end - t_start)).toFixed(2)}x`,
);
