/**
 * profiling-threaded.js — Concurrent Pipelines with Worker Threads
 *
 * This version uses TEST_CONFIGS (small/medium/large) and INPUT_SIZES
 * imported from common.js, matching your existing profiling test inputs.
 */

import { Worker } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMachineSpecs,
  saveJSON,
  ensureDirs,
  INPUT_SIZES,
} from "../lib/common.js";

// -----------------------------------------------------------------------------
// Path setup
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ensureDirs();

// -----------------------------------------------------------------------------
// Shared test configs (same as original profiling)
// -----------------------------------------------------------------------------
const TEST_CONFIGS = {
  medium: { samples: INPUT_SIZES[1].length, sampleRate: 44100 },
};

// concurrency levels (same as original profiling)
const CONCURRENCY_LEVELS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

// Safety
const WARMUP_ITERATIONS = 5;
const TEST_ITERATIONS = 20;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const STATE_READY = 0;
const STATE_PROCESS = 1;

function generateAudioSignal(bufferSize, sampleRate) {
  const signal = new Float32Array(bufferSize);
  for (let i = 0; i < bufferSize; i++) {
    signal[i] =
      0.3 * Math.sin((2 * Math.PI * 440 * i) / sampleRate) +
      0.2 * Math.sin((2 * Math.PI * 880 * i) / sampleRate) +
      0.15 * Math.sin((2 * Math.PI * 1320 * i) / sampleRate) +
      0.05 * (Math.random() * 2 - 1);
  }
  return signal;
}

function percentiles(values) {
  const s = [...values].sort((a, b) => a - b);
  return {
    p50: s[Math.floor(0.5 * s.length)],
    p95: s[Math.floor(0.95 * s.length)],
    p99: s[Math.floor(0.99 * s.length)],
    avg: s.reduce((a, b) => a + b, 0) / s.length,
    min: s[0],
    max: s[s.length - 1],
  };
}

// -----------------------------------------------------------------------------
// Worker pipeline
// -----------------------------------------------------------------------------
async function createPipelineWorker(config) {
  const BUFFER_SIZE = config.samples;
  const SAMPLE_RATE = config.sampleRate;

  // Layout inside SharedArrayBuffer:
  //   Int32 state      (4 bytes)
  //   Float32 samples  (4 * BUFFER_SIZE bytes)
  //   Float64 procTime (8 bytes)
  const STATE_OFFSET = 0;
  const STATE_BYTES = 4;

  const audioOffset = STATE_BYTES;
  const audioBytes = BUFFER_SIZE * 4;

  const float64Offset = audioOffset + audioBytes;
  const procTimeOffset = Math.ceil(float64Offset / 8) * 8; // align
  const totalBytes = procTimeOffset + 8;

  const sabSize = Math.ceil(totalBytes / 8) * 8;
  const sharedBuffer = new SharedArrayBuffer(sabSize);

  const sharedState = new Int32Array(sharedBuffer, STATE_OFFSET, 1);
  const sharedFloatArray = new Float32Array(
    sharedBuffer,
    audioOffset,
    BUFFER_SIZE
  );
  const procTimeView = new Float64Array(sharedBuffer, procTimeOffset, 1);

  // seed audio
  const signal = generateAudioSignal(BUFFER_SIZE, SAMPLE_RATE);
  sharedFloatArray.set(signal);

  const worker = new Worker(path.join(__dirname, "concurrency-worker.js"), {
    workerData: {
      sharedBuffer,
      bufferSize: BUFFER_SIZE,
      sampleRate: SAMPLE_RATE,
      pipelineType: "complex", // concurrency always uses the heavy pipeline
      offsets: {
        state: STATE_OFFSET,
        audio: audioOffset,
        procTime: procTimeOffset,
      },
    },
  });

  // Wait for ready
  await new Promise((res, rej) => {
    const onMsg = (m) => {
      if (m && m.type === "ready") {
        worker.off("message", onMsg);
        res();
      }
    };
    worker.on("message", onMsg);
    worker.on("error", rej);
    worker.on("exit", (code) => {
      if (code !== 0) rej(new Error(`Worker exited early: ${code}`));
    });
  });

  return { worker, sharedState, procTimeView, config };
}

function runIteration(pipelines) {
  const start = performance.now();

  for (const { sharedState } of pipelines) {
    Atomics.store(sharedState, 0, STATE_PROCESS);
    Atomics.notify(sharedState, 0, 1);
  }

  for (const { sharedState } of pipelines) {
    Atomics.wait(sharedState, 0, STATE_PROCESS);
  }

  return performance.now() - start;
}

// -----------------------------------------------------------------------------
// Benchmark runner
// -----------------------------------------------------------------------------
async function runThreadedConcurrency() {
  const allResults = [];

  for (const [configName, config] of Object.entries(TEST_CONFIGS)) {
    console.log("\n" + "=".repeat(90));
    console.log(
      `THREAD-aware Concurrent Pipelines — ${configName.toUpperCase()} (${
        config.samples
      } samples)`
    );
    console.log("=".repeat(90));

    let baselineThroughput = null;

    for (const num of CONCURRENCY_LEVELS) {
      console.log(`\n▶ Spawning ${num} worker pipelines...`);

      const pipelines = [];
      for (let i = 0; i < num; i++) {
        // eslint-disable-next-line no-await-in-loop
        const p = await createPipelineWorker(config);
        pipelines.push(p);
      }

      // Warmup
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        runIteration(pipelines);
      }

      // Measure
      const iterationTimes = [];
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        const t = runIteration(pipelines);
        iterationTimes.push(t);
      }

      const stats = percentiles(iterationTimes);

      const totalSamplesPerIter = config.samples * num;
      const avgSeconds = stats.avg / 1000;
      const throughput = totalSamplesPerIter / avgSeconds;

      if (baselineThroughput == null) baselineThroughput = throughput;
      const efficiency = (throughput / baselineThroughput) * 100;

      const record = {
        test: "concurrent_load_threaded",
        config: configName,
        num_pipelines: num,
        samples_per_pipeline: config.samples,
        total_samples_per_iter: totalSamplesPerIter,
        iterations: TEST_ITERATIONS,
        time_avg_ms: stats.avg.toFixed(3),
        time_p50_ms: stats.p50.toFixed(3),
        time_p95_ms: stats.p95.toFixed(3),
        time_p99_ms: stats.p99.toFixed(3),
        time_min_ms: stats.min.toFixed(3),
        time_max_ms: stats.max.toFixed(3),
        throughput_samples_per_sec: throughput.toFixed(0),
        efficiency_percent: efficiency.toFixed(1),
        threaded: true,
        meta: getMachineSpecs(),
      };

      allResults.push(record);

      console.log(
        `   → avg=${record.time_avg_ms}ms, throughput=${record.throughput_samples_per_sec}/s, eff=${record.efficiency_percent}%`
      );

      // Cleanup
      for (const { worker } of pipelines) worker.terminate();
    }
  }

  saveJSON("profiling-concurrency-threaded", allResults);
  console.log("\n✅ Saved profiling-concurrency-threaded.json\n");
}

// Run it
runThreadedConcurrency().catch((err) => {
  console.error(err);
  process.exit(1);
});
