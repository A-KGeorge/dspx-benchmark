/**
 * Quick test to verify parallel processing implementation
 * Run with: node tests/test-parallel.js
 */
import { DspThreadPool, isParallelAvailable } from "../lib/parallel.js";
import { genSignal } from "../lib/common.js";
import { performance } from "node:perf_hooks";

console.log("🧪 Testing Parallel Processing Implementation\n");

// Check availability
const check = isParallelAvailable();
console.log("Parallel Processing Status:");
console.log(`  Available: ${check.available}`);
console.log(`  Reason: ${check.reason}`);
if (check.maxThreads) {
  console.log(`  Max Threads: ${check.maxThreads}`);
}
console.log("");

if (!check.available) {
  console.log("❌ Parallel processing not available. Exiting.");
  process.exit(1);
}

// Test configuration
const SIGNAL_SIZE = 100000;
const FILTER_ORDER = 51;
const KERNEL_SIZE = 64;

async function testParallelFirFilter() {
  console.log("📊 Testing Parallel FIR Filter");
  console.log("-".repeat(60));

  // Create batch of signals to process in parallel
  const BATCH_SIZE = 10;
  const signals = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    signals.push(genSignal(SIGNAL_SIZE, 50, 10000));
  }

  const filterConfig = {
    type: "fir",
    mode: "lowpass",
    cutoffFrequency: 2000,
    sampleRate: 10000,
    order: FILTER_ORDER,
    windowType: "hamming",
  };

  const pool = new DspThreadPool(check.maxThreads);
  await pool.init();

  console.log(`  Batch size: ${BATCH_SIZE} signals`);
  console.log(`  Signal size: ${SIGNAL_SIZE.toLocaleString()} samples each`);
  console.log(`  Filter order: ${FILTER_ORDER}`);
  console.log(`  Workers: ${check.maxThreads}`);

  const t0 = performance.now();
  const results = await pool.processFirFilterParallel(
    signals,
    filterConfig,
    10000,
  );
  const elapsed = performance.now() - t0;

  await pool.terminate();

  console.log(`  ✓ Completed in ${elapsed.toFixed(2)} ms`);
  console.log(`  Output: ${results.length} signals`);
  console.log(`  Each signal: ${results[0].length.toLocaleString()} samples`);
  console.log(
    `  Throughput: ${(((BATCH_SIZE * SIGNAL_SIZE) / elapsed) * 1000).toLocaleString()} samples/sec`,
  );
  console.log("");

  // Validate output
  if (results.length !== BATCH_SIZE) {
    throw new Error(
      `Batch size mismatch: expected ${BATCH_SIZE}, got ${results.length}`,
    );
  }
  if (results[0].length !== SIGNAL_SIZE) {
    throw new Error(
      `Signal size mismatch: expected ${SIGNAL_SIZE}, got ${results[0].length}`,
    );
  }

  return { success: true, time: elapsed };
}

async function testParallelConvolution() {
  console.log("📊 Testing Parallel Convolution");
  console.log("-".repeat(60));

  // Create batch of signals to process in parallel
  const BATCH_SIZE = 10;
  const signals = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    signals.push(genSignal(SIGNAL_SIZE, 50, 10000));
  }
  const kernel = new Float32Array(KERNEL_SIZE).map(() => Math.random());

  // Create new pool for convolution (don't call init - let processConvolutionParallel do it)
  const pool = new DspThreadPool(check.maxThreads);

  console.log(`  Batch size: ${BATCH_SIZE} signals`);
  console.log(`  Signal size: ${SIGNAL_SIZE.toLocaleString()} samples each`);
  console.log(`  Kernel size: ${KERNEL_SIZE}`);
  console.log(`  Workers: ${check.maxThreads}`);

  const t0 = performance.now();
  const results = await pool.processConvolutionParallel(signals, kernel);
  const elapsed = performance.now() - t0;

  await pool.terminate();

  const expectedOutputSize = SIGNAL_SIZE - KERNEL_SIZE + 1;
  console.log(`  ✓ Completed in ${elapsed.toFixed(2)} ms`);
  console.log(`  Output: ${results.length} signals`);
  console.log(`  Each signal: ${results[0].length.toLocaleString()} samples`);
  console.log(
    `  Throughput: ${(((BATCH_SIZE * SIGNAL_SIZE) / elapsed) * 1000).toLocaleString()} samples/sec`,
  );
  console.log("");

  // Validate output
  if (results.length !== BATCH_SIZE) {
    throw new Error(
      `Batch size mismatch: expected ${BATCH_SIZE}, got ${results.length}`,
    );
  }
  if (results[0].length !== expectedOutputSize) {
    throw new Error(
      `Output size mismatch: expected ${expectedOutputSize}, got ${results[0].length}`,
    );
  }

  return { success: true, time: elapsed };
}

// Run tests
try {
  const firResult = await testParallelFirFilter();
  const convResult = await testParallelConvolution();

  console.log("=".repeat(60));
  console.log("✅ All parallel processing tests passed!");
  console.log(`   FIR Filter: ${firResult.time.toFixed(2)} ms`);
  console.log(`   Convolution: ${convResult.time.toFixed(2)} ms`);
  console.log("");
} catch (error) {
  console.error("❌ Test failed:", error.message);
  console.error(error.stack);
  process.exit(1);
}
