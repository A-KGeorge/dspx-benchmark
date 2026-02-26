/**
 * Dedicated Parallel Processing Benchmark
 * Tests parallel FIR and convolution in isolation (no prior workload contamination)
 */

import {
  INPUT_SIZES,
  genSignal,
  getMachineSpecs,
  runTimed,
  saveJSON,
  printResult,
  getSummaryLine,
  ensureDirs,
  getPlatformId,
} from "../lib/common.js";
import { DspThreadPool, isParallelAvailable } from "../lib/parallel.js";

ensureDirs();

console.log("🚀 Parallel Processing Benchmark (Isolated)\n");
console.log("Testing worker threads + SharedArrayBuffer + Atomics\n");

const specs = getMachineSpecs();
const platformId = getPlatformId();
console.log("Machine Specs:");
console.log(`  CPU: ${specs.cpu}`);
console.log(`  Cores: ${specs.cores}`);
console.log(`  RAM: ${specs.ram}`);
console.log(`  OS: ${specs.os}`);
console.log(`  Platform: ${platformId}`);
console.log(`  Node: ${specs.node}`);
console.log(`  dspx: ${specs.dspx}`);
console.log("");

const results = [];
const CONV_SIGNAL_SIZE = 65536;

// Check parallel availability
const parallelCheck = isParallelAvailable();
if (!parallelCheck.available) {
  console.log("⚠️  Parallel processing not available:");
  console.log(`   ${parallelCheck.reason}\n`);
  process.exit(1);
}

console.log("=".repeat(80));
console.log("PARALLEL PROCESSING BENCHMARKS");
console.log("=".repeat(80));
console.log(
  `ℹ️  ${parallelCheck.reason} - using ${parallelCheck.maxThreads} worker threads\n`,
);

// ============================================================================
// Parallel FIR Filter
// ============================================================================

try {
  console.log("\n📊 Parallel FIR Filter Benchmarks");
  console.log("-".repeat(80));

  // Create dedicated pool for FIR benchmarks
  const firThreadPool = new DspThreadPool(parallelCheck.maxThreads);

  // Pre-initialize with filter config (same for all sizes)
  const filterConfig = {
    type: "fir",
    mode: "lowpass",
    cutoffFrequency: 2000,
    sampleRate: 10000,
    order: 51,
    windowType: "hamming",
  };
  await firThreadPool.init({ filterConfig });
  console.log(
    `✓ Worker pool initialized with ${parallelCheck.maxThreads} threads\n`,
  );

  for (const size of INPUT_SIZES) {
    // Create batch of signals for parallel processing
    const BATCH_SIZE = 10;
    const signals = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      signals.push(genSignal(size.length, 50, 10000));
    }

    const sampleRate = 10000;

    console.log(`\n🔬 Testing Parallel FIR Filter with ${size.name} input`);
    console.log(
      `   Batch: ${BATCH_SIZE} signals × ${size.length.toLocaleString()} samples = ${(BATCH_SIZE * size.length).toLocaleString()} total samples`,
    );

    try {
      const result = await runTimed(
        "dspx-fir-parallel",
        async () => {
          return await firThreadPool.processFirFilterParallel(
            signals,
            filterConfig,
            sampleRate,
          );
        },
        2,
        5,
      );

      const totalSamples = BATCH_SIZE * size.length;
      const data = {
        test: "fir_filter_parallel",
        input: size.name,
        samples: size.length,
        batch_size: BATCH_SIZE,
        total_samples: totalSamples,
        lib: "dspx",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (totalSamples / result.avg) * 1000,
        backend: `CPU (Native C++ SIMD + ${parallelCheck.maxThreads} Worker Threads)`,
        filter_order: 51,
        num_threads: parallelCheck.maxThreads,
        meta: specs,
      };

      results.push(data);
      printResult(data);

      // Calculate theoretical speedup
      const singleThreadedTime = (totalSamples / 34.91e6) * 1000; // 34.91M samples/sec from single-threaded medium benchmark
      const theoreticalSpeedup = singleThreadedTime / result.avg;
      console.log(
        `   💡 Parallel speedup: ${theoreticalSpeedup.toFixed(2)}x (vs ~34.91M samples/sec single-threaded)`,
      );
    } catch (e) {
      console.error("❌ Parallel FIR Filter failed:", e.message);
    }
  }

  // Cleanup FIR thread pool
  await firThreadPool.terminate();
  console.log("\n✓ FIR thread pool terminated\n");
} catch (e) {
  console.error("❌ Parallel FIR processing failed:", e.message);
}

// ============================================================================
// Parallel Convolution
// ============================================================================

try {
  console.log("\n📊 Parallel Convolution Benchmarks");
  console.log("-".repeat(80));

  const PARALLEL_KERNEL_SIZES = [8, 32, 64, 128, 256];

  for (const kernelSize of PARALLEL_KERNEL_SIZES) {
    // Create dedicated pool for THIS kernel size (since kernel is configured at worker startup)
    const convThreadPool = new DspThreadPool(parallelCheck.maxThreads);

    // Create batch of signals for parallel processing
    const BATCH_SIZE = 10;
    const signals = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      signals.push(genSignal(CONV_SIGNAL_SIZE, 50, 10000));
    }
    const kernel = new Float32Array(kernelSize).map(() => Math.random());

    // Pre-initialize with this specific kernel
    await convThreadPool.init({
      convolutionConfig: { kernel, mode: "batch" },
    });

    console.log(`\n🔬 Testing Parallel Convolution (kernel=${kernelSize})`);
    console.log(
      `   Batch: ${BATCH_SIZE} signals × ${CONV_SIGNAL_SIZE.toLocaleString()} samples, kernel=${kernelSize}`,
    );
    console.log(
      `   Worker pool: ${parallelCheck.maxThreads} threads initialized`,
    );

    try {
      const result = await runTimed(
        "dspx-conv-parallel",
        async () => {
          return await convThreadPool.processConvolutionParallel(
            signals,
            kernel,
            "batch",
            10000,
          );
        },
        2,
        5,
      );

      const totalSamples = BATCH_SIZE * CONV_SIGNAL_SIZE;
      const data = {
        test: "conv1d_parallel",
        input: `kernel${kernelSize}`,
        samples: CONV_SIGNAL_SIZE,
        batch_size: BATCH_SIZE,
        total_samples: totalSamples,
        signal_size: CONV_SIGNAL_SIZE,
        kernel_size: kernelSize,
        lib: "dspx",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (totalSamples / result.avg) * 1000,
        backend: `CPU (Native C++ SIMD + ${parallelCheck.maxThreads} Worker Threads)`,
        num_threads: parallelCheck.maxThreads,
        meta: specs,
      };

      results.push(data);
      printResult(data);

      // Calculate theoretical speedup based on kernel size
      const singleThreadedThroughput =
        kernelSize === 64 ? 145.91e6 : kernelSize === 128 ? 56.73e6 : 57.1e6;
      const singleThreadedTime =
        (totalSamples / singleThreadedThroughput) * 1000;
      const theoreticalSpeedup = singleThreadedTime / result.avg;
      console.log(
        `   💡 Parallel speedup: ${theoreticalSpeedup.toFixed(2)}x (vs ${(singleThreadedThroughput / 1e6).toFixed(2)}M samples/sec single-threaded)`,
      );
    } catch (e) {
      console.error(
        `❌ Parallel Convolution (kernel=${kernelSize}) failed:`,
        e.message,
      );
    }

    // Cleanup this kernel's thread pool
    await convThreadPool.terminate();
    console.log(`   ✓ Pool terminated\n`);
  }

  console.log("✓ All convolution parallel benchmarks complete\n");
} catch (e) {
  console.error("❌ Parallel convolution processing failed:", e.message);
}

// Save results
saveJSON("parallel-speed", results);
getSummaryLine(results);

console.log("✅ Parallel processing benchmarks complete!\n");
