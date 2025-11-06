/**
 * profiling.js — Memory, Latency Percentiles, and Concurrent Load Testing
 *
 * Generates three new benchmark stories:
 * 1. Memory usage: peak heap, GC pressure, working set
 * 2. Latency percentiles: p50, p95, p99 under steady-state load
 * 3. Concurrent pipelines: 4-32 independent DSP graphs competing for resources
 */

import { createDspPipeline } from "dspx";
import { performance } from "node:perf_hooks";
import {
  getMachineSpecs,
  saveJSON,
  ensureDirs,
  INPUT_SIZES,
} from "./common.js";

const WARMUP_ITERATIONS = 10;
const TEST_ITERATIONS = 50;
const GC_INTERVAL = 5; // Force GC every N iterations

function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

function generateSignal(size, sampleRate) {
  return new Float32Array(size).map(
    (_, i) =>
      Math.sin((2 * Math.PI * 50 * i) / sampleRate) +
      0.5 * Math.sin((2 * Math.PI * 120 * i) / sampleRate) +
      0.1 * Math.random()
  );
}

const TEST_CONFIGS = {
  small: { samples: INPUT_SIZES[0].length, sampleRate: 10000 },
  medium: { samples: INPUT_SIZES[1].length, sampleRate: 44100 },
  large: { samples: INPUT_SIZES[2].length, sampleRate: 48000 },
};

async function runMemoryTest(config, configName) {
  console.log(`\n📊 Memory Test: ${configName}`);
  console.log(`   Samples: ${config.samples.toLocaleString()}`);
  console.log(`   Sample Rate: ${config.sampleRate} Hz`);

  const signal = generateSignal(config.samples, config.sampleRate);

  // Warmup
  console.log(`   Warming up (${WARMUP_ITERATIONS} iterations)...`);
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    const pipeline = createDspPipeline();
    pipeline
      .filter({
        type: "fir",
        mode: "lowpass",
        cutoffFrequency: 3000,
        sampleRate: config.sampleRate,
        order: 51,
        windowType: "hamming",
      })
      .Rms({ mode: "moving", windowSize: 100 });

    await pipeline.process(signal, {
      sampleRate: config.sampleRate,
      channels: 1,
    });
  }

  forceGC();
  await new Promise((r) => setTimeout(r, 100));

  // Memory measurement
  console.log(`   Running test (${TEST_ITERATIONS} iterations)...`);
  const heapBefore = process.memoryUsage().heapUsed;
  const snapshots = [];

  for (let i = 0; i < TEST_ITERATIONS; i++) {
    const pipeline = createDspPipeline();

    pipeline
      .filter({
        type: "fir",
        mode: "lowpass",
        cutoffFrequency: 3000,
        sampleRate: config.sampleRate,
        order: 51,
        windowType: "hamming",
      })
      .Rms({ mode: "moving", windowSize: 100 });

    await pipeline.process(signal, {
      sampleRate: config.sampleRate,
      channels: 1,
    });

    // ✅ FIX: Force GC periodically to prevent accumulation
    if (i % GC_INTERVAL === 0) {
      forceGC();
      await new Promise((r) => setTimeout(r, 10));
      snapshots.push({
        iteration: i,
        heap: process.memoryUsage().heapUsed - heapBefore,
      });
    }
  }

  forceGC();
  await new Promise((r) => setTimeout(r, 100));
  const heapAfter = process.memoryUsage().heapUsed;

  const heapGrowth = heapAfter - heapBefore;
  const perIteration = heapGrowth / TEST_ITERATIONS;

  console.log(`   ✅ Heap growth: ${(heapGrowth / 1024).toFixed(2)} KB`);
  console.log(`   ✅ Per iteration: ${(perIteration / 1024).toFixed(2)} KB`);
  console.log(
    `   Status: ${
      Math.abs(perIteration) < 1024 ? "✅ NO LEAK" : "❌ LEAK DETECTED"
    }`
  );

  return {
    test: "memory_profiling",
    input: configName,
    samples: config.samples,
    iterations: TEST_ITERATIONS,
    heap_used_before_mb: (heapBefore / 1024 / 1024).toFixed(2),
    heap_used_after_mb: (heapAfter / 1024 / 1024).toFixed(2),
    heap_growth_mb: (heapGrowth / 1024 / 1024).toFixed(2),
    heap_growth_per_iter_kb: (perIteration / 1024).toFixed(2),
    heap_peak_mb: (
      Math.max(...snapshots.map((s) => s.heap + heapBefore)) /
      1024 /
      1024
    ).toFixed(2),
    meta: getMachineSpecs(),
  };
}

async function runLatencyTest(config, configName) {
  console.log(`\n⏱️  Latency Test: ${configName}`);

  const signal = generateSignal(config.samples, config.sampleRate);

  // Warmup
  const warmupPipeline = createDspPipeline();
  warmupPipeline
    .filter({
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: 3000,
      sampleRate: config.sampleRate,
      order: 51,
      windowType: "hamming",
    })
    .Rms({ mode: "moving", windowSize: 100 });

  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await warmupPipeline.process(signal, {
      sampleRate: config.sampleRate,
      channels: 1,
    });
  }

  // ✅ FIX: Reuse pipeline for latency measurement
  const latencies = [];

  for (let i = 0; i < TEST_ITERATIONS; i++) {
    const start = performance.now();
    await warmupPipeline.process(signal, {
      sampleRate: config.sampleRate,
      channels: 1,
    });
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log(`   p50: ${p50.toFixed(2)} ms`);
  console.log(`   p95: ${p95.toFixed(2)} ms`);
  console.log(`   p99: ${p99.toFixed(2)} ms`);

  return {
    test: "latency_profiling",
    input: configName,
    samples: config.samples,
    iterations: TEST_ITERATIONS,
    latency_p50_ms: p50.toFixed(3),
    latency_p95_ms: p95.toFixed(3),
    latency_p99_ms: p99.toFixed(3),
    latency_min_ms: min.toFixed(3),
    latency_max_ms: max.toFixed(3),
    latency_avg_ms: avg.toFixed(3),
    meta: getMachineSpecs(),
  };
}

async function runConcurrentTest() {
  console.log(`\n🔀 Concurrent Pipeline Scaling Test`);

  const config = TEST_CONFIGS.medium;
  const signal = generateSignal(config.samples, config.sampleRate);
  const concurrencyLevels = [1, 2, 4, 8, 16, 32];

  const results = [];

  for (const concurrency of concurrencyLevels) {
    console.log(`\n   Testing ${concurrency} concurrent pipelines...`);

    const pipelines = Array.from({ length: concurrency }, () => {
      const p = createDspPipeline();
      p.filter({
        type: "fir",
        mode: "lowpass",
        cutoffFrequency: 3000,
        sampleRate: config.sampleRate,
        order: 51,
        windowType: "hamming",
      }).Rms({ mode: "moving", windowSize: 100 });
      return p;
    });

    // Warmup
    await Promise.all(
      pipelines.map((p) =>
        p.process(signal, { sampleRate: config.sampleRate, channels: 1 })
      )
    );

    // Measure throughput
    const iterations = 20;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await Promise.all(
        pipelines.map((p) =>
          p.process(signal, { sampleRate: config.sampleRate, channels: 1 })
        )
      );
      times.push(performance.now() - start);
    }

    const sortedTimes = [...times].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;

    const totalSamples = config.samples * concurrency;
    const throughput = (totalSamples / avg) * 1000; // samples/sec

    console.log(
      `      Throughput: ${(throughput / 1e6).toFixed(2)} M samples/sec`
    );

    results.push({
      test: "concurrent_load",
      num_pipelines: concurrency,
      samples_per_pipeline: config.samples,
      total_samples_per_iter: totalSamples,
      iterations: iterations,
      time_avg_ms: avg.toFixed(3),
      time_p50_ms: p50.toFixed(3),
      time_p95_ms: p95.toFixed(3),
      time_p99_ms: p99.toFixed(3),
      time_min_ms: Math.min(...times).toFixed(3),
      time_max_ms: Math.max(...times).toFixed(3),
      throughput_samples_per_sec: throughput.toFixed(0),
      efficiency_percent:
        concurrency > 1
          ? (
              (throughput /
                concurrency /
                (results[0]?.throughput_samples_per_sec || throughput)) *
              100
            ).toFixed(1)
          : "100.0",
      meta: getMachineSpecs(),
    });
  }

  return results;
}

async function main() {
  ensureDirs();

  const specs = getMachineSpecs();
  console.log(
    "🚀 Profiling Story — Memory, Latency Percentiles, Concurrency\n"
  );
  console.log("Machine Specs:");
  console.log(`  CPU: ${specs.cpu}`);
  console.log(`  Cores: ${specs.cores}`);
  console.log(`  RAM: ${specs.ram}`);
  console.log(`  Node: ${specs.node}`);
  console.log(
    `  GC: ${
      global.gc ? "✅ enabled" : "⚠️  disabled (run with --expose-gc)"
    }\n`
  );

  const memoryResults = [];
  const latencyResults = [];

  console.log("=".repeat(80));
  console.log("MEMORY & LATENCY PROFILING");
  console.log("=".repeat(80));

  for (const [name, config] of Object.entries(TEST_CONFIGS)) {
    try {
      const memResult = await runMemoryTest(config, name);
      const latResult = await runLatencyTest(config, name);

      // Combine memory and latency results for this input size
      memoryResults.push({
        ...memResult,
        latency_p50_ms: latResult.latency_p50_ms,
        latency_p95_ms: latResult.latency_p95_ms,
        latency_p99_ms: latResult.latency_p99_ms,
        latency_min_ms: latResult.latency_min_ms,
        latency_max_ms: latResult.latency_max_ms,
        latency_avg_ms: latResult.latency_avg_ms,
      });
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }

  const concurrentResults = await runConcurrentTest();

  // Save results to platform-specific directories
  console.log("\n" + "=".repeat(80));
  console.log("SAVING RESULTS");
  console.log("=".repeat(80));

  saveJSON("profiling-memory", memoryResults);
  saveJSON("profiling-concurrency", concurrentResults);

  console.log("\n✅ Profiling complete!\n");
  console.log("📁 Results saved:");
  console.log("   profiling-memory.json");
  console.log("   profiling-concurrency.json\n");
}

main().catch(console.error);
