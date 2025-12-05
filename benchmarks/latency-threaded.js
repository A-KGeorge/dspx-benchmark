/**
 * latency-threaded.js — Latency Percentiles with Worker Threads
 *
 * Measures DSP processing latencies (p50, p95, p99) using worker threads
 * to isolate from main thread JS overhead, similar to profiling.js but threaded.
 *
 * Architecture:
 * - Main Thread: Test orchestration, signal generation, timing
 * - Worker Thread: DSP processing, Atomics.wait() for zero-CPU idle
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
// 🔄 Shared Memory States (Atomic Synchronization)
// -----------------------------------------------------------------------------
const STATE_READY = 0; // Worker ready for next block
const STATE_PROCESS = 1; // Main signals: process this block

// -----------------------------------------------------------------------------
// 📊 Test Configurations
// -----------------------------------------------------------------------------
const TEST_CONFIGS = {
  small: { samples: INPUT_SIZES[0].length, sampleRate: 10000 },
  medium: { samples: INPUT_SIZES[1].length, sampleRate: 44100 },
  large: { samples: INPUT_SIZES[2].length, sampleRate: 48000 },
};

// Test parameters
const WARMUP_ITERATIONS = 10;
const TEST_ITERATIONS = 50;

// -----------------------------------------------------------------------------
// 🎵 Generate realistic audio block
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 📊 Statistics Helpers
// -----------------------------------------------------------------------------
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
// 🚀 Worker Setup
// -----------------------------------------------------------------------------
async function createLatencyWorker(config) {
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

  // Seed audio
  const signal = generateAudioSignal(BUFFER_SIZE, SAMPLE_RATE);
  sharedFloatArray.set(signal);

  const worker = new Worker(path.join(__dirname, "latency-worker.js"), {
    workerData: {
      sharedBuffer,
      bufferSize: BUFFER_SIZE,
      sampleRate: SAMPLE_RATE,
      offsets: {
        state: STATE_OFFSET,
        audio: audioOffset,
        procTime: procTimeOffset,
      },
    },
  });

  // Handle worker errors
  worker.on("error", (err) => {
    console.error(`Worker error for latency test:`, err);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Worker exited with code ${code} for latency test`);
    }
  });

  // Wait for worker to be ready with timeout + logging
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error(`❌ Timeout waiting for worker ready for latency test`);
      cleanup();
      reject(new Error(`Timeout waiting for worker ready for latency test`));
    }, 10000); // 10s is plenty for init

    function onMessage(msg) {
      if (msg && msg.type === "ready") {
        clearTimeout(timeout);
        cleanup();
        resolve();
      }
    }

    function onError(err) {
      clearTimeout(timeout);
      cleanup();
      reject(err);
    }

    function onExit(code) {
      clearTimeout(timeout);
      cleanup();
      if (code !== 0) {
        reject(new Error(`Worker exited early: ${code}`));
      }
    }

    function cleanup() {
      worker.off("message", onMessage);
      worker.off("error", onError);
      worker.off("exit", onExit);
    }

    worker.on("message", onMessage);
    worker.on("error", onError);
    worker.on("exit", onExit);
  });

  return { worker, sharedState, procTimeView, config };
}

function runIteration({ sharedState, procTimeView }) {
  // Trigger processing
  Atomics.store(sharedState, 0, STATE_PROCESS);
  Atomics.notify(sharedState, 0, 1);

  // Wait for completion
  Atomics.wait(sharedState, 0, STATE_PROCESS);

  // Get the processing time from worker
  return procTimeView[0];
}

// -----------------------------------------------------------------------------
// 🧪 Benchmark Runner
// -----------------------------------------------------------------------------
async function runThreadedLatency() {
  const allResults = [];

  for (const [configName, config] of Object.entries(TEST_CONFIGS)) {
    console.log("\n" + "=".repeat(80));
    console.log(
      `THREAD-aware Latency Test — ${configName.toUpperCase()} (${config.samples.toLocaleString()} samples)`
    );
    console.log("=".repeat(80));

    console.log(`\n▶ Creating latency worker...`);

    const workerData = await createLatencyWorker(config);

    // Warmup
    console.log(`   Warming up (${WARMUP_ITERATIONS} iterations)...`);
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      runIteration(workerData);
    }

    // Measure latencies
    console.log(`   Running test (${TEST_ITERATIONS} iterations)...`);
    const latencies = [];
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      const latency = runIteration(workerData);
      latencies.push(latency);
    }

    const stats = percentiles(latencies);

    console.log(`   p50: ${stats.p50.toFixed(2)} ms`);
    console.log(`   p95: ${stats.p95.toFixed(2)} ms`);
    console.log(`   p99: ${stats.p99.toFixed(2)} ms`);

    const record = {
      test: "latency_profiling_threaded",
      input: configName,
      samples: config.samples,
      iterations: TEST_ITERATIONS,
      latency_p50_ms: stats.p50.toFixed(3),
      latency_p95_ms: stats.p95.toFixed(3),
      latency_p99_ms: stats.p99.toFixed(3),
      latency_min_ms: stats.min.toFixed(3),
      latency_max_ms: stats.max.toFixed(3),
      latency_avg_ms: stats.avg.toFixed(3),
      threaded: true,
      meta: getMachineSpecs(),
    };

    allResults.push(record);

    // Cleanup
    workerData.worker.terminate();
  }

  saveJSON("profiling-latency-threaded", allResults);
  console.log("\n✅ Saved profiling-latency-threaded.json\n");
}

// -----------------------------------------------------------------------------
// 🚀 MAIN — Threaded Latency Test
// -----------------------------------------------------------------------------
(async function main() {
  console.log("Starting Threaded Latency Test...");

  await runThreadedLatency();

  console.log("\n\n🔥 Threaded Latency Test complete!");
  console.log("📁 Saved: profiling-latency-threaded.json\n");
})().catch((e) => {
  console.error("FATAL BENCHMARK ERROR:", e);
  process.exit(1);
});
