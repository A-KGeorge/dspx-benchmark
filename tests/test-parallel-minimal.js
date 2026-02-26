/**
 * Minimal parallel test - just 2 workers to isolate the V8 threading issue
 */
import { DspThreadPool } from "../lib/parallel.js";

async function runMinimalTest() {
  console.log("\n🧪 Minimal Parallel Test (2 workers)\n");

  const pool = new DspThreadPool(2); // Just 2 workers

  try {
    console.log("Initializing pool...");
    await pool.init();
    console.log("Pool initialized\n");

    // Create just 2 signals (one per worker)
    const signals = [];
    for (let i = 0; i < 2; i++) {
      const signal = new Float32Array(1000); // Small signal
      for (let j = 0; j < signal.length; j++) {
        signal[j] = Math.sin((2 * Math.PI * j) / signal.length);
      }
      signals.push(signal);
    }

    const filterConfig = {
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: 200,
      sampleRate: 1000,
      order: 51,
      windowType: "hamming",
    };

    console.log("Processing 2 signals with 2 workers...");
    const results = await pool.processFirFilterParallel(
      signals,
      filterConfig,
      1000,
    );

    console.log(`✅ Got ${results.length} results`);
    console.log(`   Result 0 length: ${results[0].length}`);
    console.log(`   Result 1 length: ${results[1].length}`);

    await pool.terminate();
    console.log("\n✅ Minimal test passed\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMinimalTest();
