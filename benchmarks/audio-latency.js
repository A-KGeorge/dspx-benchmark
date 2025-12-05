/**
 * Story 6 — Real-Time Audio Latency (Stress-Test Edition)
 *
 * This version simulates real-world loads by injecting:
 * - CPU noise (tight loops + background workers)
 * - Random latency spikes (scheduler interference)
 * - Timers jitter (perf_hooks granularity noise)
 * - Microtasks & GC pressure
 * - Cache eviction via large allocations
 * - Occasional async "interrupts"
 *
 * 🟢 FIX: Ensures main test pipeline and background noise pipelines are separate instances,
 * preventing the "Pipeline is busy" race condition.
 */

import { createDspPipeline, DriftDetector } from "dspx";
import { performance } from "node:perf_hooks";
import { saveJSON, ensureDirs } from "../lib/common.js";

ensureDirs();

// ------------------------------------------------------------
// 🧨 Background CPU Noise Generator
// ------------------------------------------------------------
function createCpuNoiseLoad() {
  let active = true;

  // continuously spin the CPU with random bursts
  (function loop() {
    if (!active) return;
    const end = performance.now() + Math.random() * 0.4; // 0–0.4 ms burst
    while (performance.now() < end) {}

    // schedule next burst with 0–3ms delay
    setTimeout(loop, Math.random() * 3);
  })();

  return () => (active = false);
}

// ------------------------------------------------------------
// 🧨 Memory Churn (cache eviction simulation)
// ------------------------------------------------------------
function churnMemory() {
  // allocate small buffer randomly to hit L3/L2
  const size = 1024 * 16 + Math.floor(Math.random() * 1024 * 64);
  const buf = new Float32Array(size);
  for (let i = 0; i < buf.length; i += 64) buf[i] = Math.random();
}

// ------------------------------------------------------------
// 🧨 Simulate OS-like interrupt jitter
// ------------------------------------------------------------
function randomInterrupt() {
  const spike = Math.random();
  if (spike < 0.001) {
    // ~0.1% chance
    const end = performance.now() + 1.5; // 1.5 ms stall
    while (performance.now() < end) {}
  } else if (spike < 0.01) {
    // 1% chance
    const end = performance.now() + 0.3; // 0.3 ms stall
    while (performance.now() < end) {}
  }
}

// ------------------------------------------------------------
// 🧨 Random async microtask noise
// ------------------------------------------------------------
function asyncMicroNoise() {
  if (Math.random() < 0.02) {
    // 2%
    return new Promise((resolve) => setTimeout(resolve, Math.random() * 2));
  }
  return null;
}

// ------------------------------------------------------------
// 🧨 Background Load (Runs in Parallel)
// ------------------------------------------------------------
function backgroundDspLoad(pipelines) {
  // 🟢 FIX: We now call process() without awaiting it. The pipelines are
  // separate instances, so they won't trigger the lock on the main test pipeline.
  for (const pip of pipelines) {
    const input = new Float32Array(256).fill(Math.random()); // Fresh signal data
    // We intentionally don't await this, letting the promises stack up
    // to put pressure on the JS Event Loop's microtask queue.
    pip.process(input, { channels: 1, sampleRate: 48000 }).catch(() => {});
  }
}

// ------------------------------------------------------------
// ⏱️ Isochronous Waiter (The Virtual Audio Driver)
// ------------------------------------------------------------
// Yields to event loop to let GC/Noise run, but spins at the end for precision.
async function preciseWait(targetTime) {
  let now = performance.now();
  while (now < targetTime) {
    const remaining = targetTime - now;
    if (remaining > 1) {
      // Yield to the event loop to let pending I/O, timers, or background DSP finish
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    now = performance.now();
  }
  return now; // Return actual wake-up time
}

// ------------------------------------------------------------
// 🎢 The Stream Simulation
// ------------------------------------------------------------
async function runStreamSession(
  pipeline,
  signal,
  config,
  iterations,
  backgroundPipelines
) {
  const processingTimes = [];
  const wakeUpTimes = [];

  // 1. Setup Built-in Drift Detector
  const sampleRateHz = 1000 / config.duration;
  const detector = new DriftDetector({
    expectedSampleRate: sampleRateHz,
    driftThreshold: 25, // >25% jitter is a "drift event"
  });

  let nextAudioTick = performance.now();

  for (let i = 0; i < iterations; i++) {
    // --- Environment Noise ---
    randomInterrupt();
    churnMemory();
    backgroundDspLoad(backgroundPipelines);
    const asyncNoise = asyncMicroNoise();
    if (asyncNoise) await asyncNoise;

    // --- Wait for Driver Interrupt ---
    const actualWakeTime = await preciseWait(nextAudioTick);

    detector.processSample(actualWakeTime);
    wakeUpTimes.push(actualWakeTime);

    // --- DSP Processing ---
    const start = performance.now();
    // 🟢 PRIMARY TEST CALL (Awaited to ensure completion before next loop)
    await pipeline.process(signal, {
      sampleRate: config.sampleRate,
      channels: 1,
    });
    const end = performance.now();

    const duration = end - start;
    processingTimes.push(duration);

    // Schedule next block
    nextAudioTick += config.duration;
  }

  return {
    processingTimes,
    driftMetrics: detector.getMetrics(),
    traceData: wakeUpTimes.map((t, i) => ({
      timestamp: t,
      processingTime: processingTimes[i],
      // Calculate the gap between this wake-up and the previous one
      interval: i > 0 ? t - wakeUpTimes[i - 1] : config.duration,
    })),
  };
}

// ------------------------------------------------------------
// 🔊 Audio buffer configs
// ------------------------------------------------------------
const AUDIO_CONFIGS = [
  { name: "ultra-low", bufferSize: 128, sampleRate: 48000, duration: 2.67 },
  { name: "low", bufferSize: 256, sampleRate: 48000, duration: 5.33 },
  { name: "balanced", bufferSize: 512, sampleRate: 48000, duration: 10.67 },
  {
    name: "high-quality",
    bufferSize: 1024,
    sampleRate: 48000,
    duration: 21.33,
  },
  { name: "batch", bufferSize: 2048, sampleRate: 48000, duration: 42.67 },
];

const ITERATIONS = 1000;
const WARMUP = 50;

// ------------------------------------------------------------
// 🎵 Generate realistic audio block
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 📊 Jitter calc
// ------------------------------------------------------------
function calculateJitter(latencies) {
  const diffs = [];
  for (let i = 1; i < latencies.length; i++) {
    diffs.push(Math.abs(latencies[i] - latencies[i - 1]));
  }
  return {
    avgJitter: diffs.reduce((a, b) => a + b, 0) / diffs.length,
    maxJitter: Math.max(...diffs),
  };
}

function percentiles(values) {
  const s = [...values].sort((a, b) => a - b);
  return {
    p50: s[Math.floor(0.5 * s.length)],
    p95: s[Math.floor(0.95 * s.length)],
    p99: s[Math.floor(0.99 * s.length)],
    avg: s.reduce((a, b) => a + b, 0) / s.length,
    max: s[s.length - 1],
  };
}

// ------------------------------------------------------------
// 🧪 Pipeline definitions
// ------------------------------------------------------------
const PIPELINE_TYPES = [
  {
    name: "simple",
    build: (p, sr) =>
      p.filter({
        type: "butterworth",
        mode: "lowpass",
        cutoffFrequency: 8000,
        sampleRate: sr,
        order: 4,
      }),
  },
  {
    name: "moderate",
    build: (p, sr) =>
      p
        .filter({
          type: "butterworth",
          mode: "lowpass",
          cutoffFrequency: 8000,
          sampleRate: sr,
          order: 4,
        })
        .Rms({ mode: "moving", windowSize: 100 }),
  },
  {
    name: "complex",
    build: (p, sr) =>
      p
        .filter({
          type: "butterworth",
          mode: "lowpass",
          cutoffFrequency: 8000,
          sampleRate: sr,
          order: 4,
        })
        .Rms({ mode: "moving", windowSize: 100 })
        .Rectify({ mode: "full" })
        .MovingAverage({ mode: "moving", windowSize: 50 }),
  },
];

// ------------------------------------------------------------
// 🚀 MAIN — Isochronous Stress Test
// ------------------------------------------------------------
(async function main() {
  ensureDirs();

  const cpuNoiseStop = createCpuNoiseLoad();
  const results = [];

  console.log("Starting Isochronous Stress Test...");

  // 🟢 FIX: Create a pool of ISOLATED pipelines for background noise.
  // Each pipeline uses its own lock, preventing conflict with the test pipeline.
  const backgroundPipelines = Array.from({ length: 4 }, () => {
    const p = createDspPipeline();
    // Build a simple load on these background pipelines
    p.Rms({ mode: "moving", windowSize: 50 });
    return p;
  });

  for (const pipeType of PIPELINE_TYPES) {
    for (const cfg of AUDIO_CONFIGS) {
      console.log(
        `Testing ${pipeType.name} @ ${cfg.name} (${cfg.duration.toFixed(
          2
        )}ms budget)...`
      );

      const signal = generateAudioSignal(cfg.bufferSize, cfg.sampleRate);

      // 🟢 PRIMARY TEST PIPELINE (The one we measure)
      const pipeline = createDspPipeline();
      pipeType.build(pipeline, cfg.sampleRate);

      // Warmup (Standard throughput mode is fine for warmup)
      for (let i = 0; i < WARMUP; i++) {
        await pipeline.process(signal, {
          channels: 1,
          sampleRate: cfg.sampleRate,
        });
      }

      // Run the realistic stream
      const { processingTimes, driftMetrics, traceData } =
        await runStreamSession(
          pipeline,
          signal,
          cfg,
          ITERATIONS,
          backgroundPipelines
        );

      const p = percentiles(processingTimes);
      const jitter = calculateJitter(processingTimes);

      // Headroom is calculated against the FIXED duration now
      const headroom = cfg.duration - p.avg;
      const headroomPercent = (headroom / cfg.duration) * 100;

      const avgProc =
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxProc = Math.max(...processingTimes);
      const procDropouts = processingTimes.filter(
        (t) => t > cfg.duration
      ).length;

      // Calculate dropouts from drift metrics (missed deadlines)
      const dropouts = driftMetrics.driftEvents || 0;

      results.push({
        pipeline: pipeType.name,
        config: cfg.name,

        // DSP Stats (Processing)
        proc_avg_ms: avgProc,
        proc_max_ms: maxProc,
        proc_dropouts: procDropouts, // "Glitches" caused by slow DSP

        // OS Stats
        avg_ms: p.avg,
        p50_ms: p.p50,
        p95_ms: p.p95,
        p99_ms: p.p99,
        max_ms: p.max,
        jitter_avg_ms: jitter.avgJitter,
        jitter_max_ms: jitter.maxJitter,
        headroom_ms: headroom,
        headroom_percent: headroomPercent,
        dropouts,
      });

      // Dispose main pipeline
      pipeline.dispose();
    }
  }

  // Dispose background pipelines
  backgroundPipelines.forEach((p) => p.dispose());

  cpuNoiseStop();
  saveJSON("audio-latency", results);

  console.log("\n\n🔥 Isochronous Stress-test complete!");
  console.log("📁 Saved: audio-latency.json\n");
})().catch((err) => {
  // Catch any catastrophic failure and clean up noise generator
  cpuNoiseStop();
  console.error("\nCatastrophic failure in main loop:", err);
  process.exit(1);
});
