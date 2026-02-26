/**
 * Minimal parallel convolution test - just 2 workers to verify correctness
 */
import { DspThreadPool } from "../lib/parallel.js";

async function runMinimalConvolutionTest() {
  console.log("\n🧪 Minimal Parallel Convolution Test (2 workers)\n");

  const pool = new DspThreadPool(2); // Just 2 workers

  try {
    // Create 2 simple signals
    const signals = [];
    for (let i = 0; i < 2; i++) {
      const signal = new Float32Array(100);
      for (let j = 0; j < signal.length; j++) {
        signal[j] = Math.sin((2 * Math.PI * j) / signal.length);
      }
      signals.push(signal);
    }

    // Simple kernel
    const kernel = new Float32Array(5).fill(0.2); // Moving average kernel

    console.log("Processing 2 signals with 2 workers...");
    console.log(`  Signal length: 100 samples`);
    console.log(`  Kernel length: 5 samples`);
    console.log(`  Mode: batch (output = N - M + 1)`);

    const results = await pool.processConvolutionParallel(
      signals,
      kernel,
      "batch",
    );

    const expectedOutputLength = 100 - 5 + 1;

    console.log(`\n✅ Got ${results.length} results`);
    console.log(`   Result 0 length: ${results[0].length}`);
    console.log(`   Result 1 length: ${results[1].length}`);
    console.log(`   Expected length: ${expectedOutputLength}`);

    // Validate
    if (results.length !== 2) {
      throw new Error(`Expected 2 results, got ${results.length}`);
    }
    if (results[0].length !== expectedOutputLength) {
      throw new Error(
        `Expected output length ${expectedOutputLength}, got ${results[0].length}`,
      );
    }
    if (results[1].length !== expectedOutputLength) {
      throw new Error(
        `Expected output length ${expectedOutputLength}, got ${results[1].length}`,
      );
    }

    await pool.terminate();
    console.log("\n✅ Minimal convolution test passed\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMinimalConvolutionTest();
