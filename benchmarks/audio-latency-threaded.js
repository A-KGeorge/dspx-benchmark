/**
 * Story 6 — Real-Time Audio Latency (Worker Threads Edition)
 *
 * Uses Worker Threads to isolate DSP processing from main thread noise.
 * Main thread simulates OS/driver with heavy GC/network load.
 * Worker thread runs pure DSP with SharedArrayBuffer synchronization.
 *
 * Architecture:
 * - Main Thread: Clock, signal generation, system noise, deadline monitoring
 * - Worker Thread: DSP processing, Atomics.wait() for zero-CPU idle
 */

import { Worker } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { saveJSON, ensureDirs } from "../lib/common.js";

ensureDirs();

// ------------------------------------------------------------
// 🔄 Shared Memory States (Atomic Synchronization)
// ------------------------------------------------------------
const STATE_READY = 0; // Worker ready for next block
const STATE_PROCESS = 1; // Main signals: process this block

// ------------------------------------------------------------
// 🧨 Main Thread Noise Generators (OS Simulation)
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

function churnMemory() {
  // allocate small buffer randomly to hit L3/L2 cache
  const size = 1024 * 16 + Math.floor(Math.random() * 1024 * 64);
  const buf = new Float32Array(size);
  for (let i = 0; i < buf.length; i += 64) buf[i] = Math.random();
}

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

async function asyncMicroNoise() {
  if (Math.random() < 0.02) {
    // 2%
    return new Promise((resolve) => setTimeout(resolve, Math.random() * 2));
  }
  return null;
}

// ------------------------------------------------------------
// 🎵 Audio buffer configs
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
// 🚀 MAIN — Worker Thread Stress Test
// ------------------------------------------------------------
(async function main() {
  ensureDirs();

  const cpuNoiseStop = createCpuNoiseLoad();
  const results = [];

  console.log("Starting Worker Thread Stress Test...");

  for (const pipeType of PIPELINE_TYPES) {
    for (const cfg of AUDIO_CONFIGS) {
      console.log(
        `Testing ${pipeType.name} @ ${cfg.name} (${cfg.duration.toFixed(
          2
        )}ms budget)...`
      );

      // Create shared memory for this test
      // Layout:
      //   int32[0]            -> state
      //   float32[0..N-1]     -> audio samples
      //   float64[0]          -> processing time
      const STATE_OFFSET = 0;
      const STATE_BYTES = 4;

      const audioOffset = STATE_BYTES; // 4
      const audioBytes = cfg.bufferSize * 4; // float32
      const float64Offset = audioOffset + audioBytes;
      const procTimeOffset = Math.ceil(float64Offset / 8) * 8; // 8-byte aligned
      const totalBytes = procTimeOffset + 8; // one float64

      const sabSize = Math.ceil(totalBytes / 8) * 8; // align whole SAB to 8 bytes
      const sharedBuffer = new SharedArrayBuffer(sabSize);

      const sharedState = new Int32Array(sharedBuffer, STATE_OFFSET, 1);
      const sharedFloatArray = new Float32Array(
        sharedBuffer,
        audioOffset,
        cfg.bufferSize
      );
      const procTimeView = new Float64Array(sharedBuffer, procTimeOffset, 1);

      // Generate signal in shared memory
      const signal = generateAudioSignal(cfg.bufferSize, cfg.sampleRate);
      sharedFloatArray.set(signal);

      // Create worker
      const worker = new Worker(new URL("./audio-worker.js", import.meta.url), {
        type: "module",
        workerData: {
          sharedBuffer,
          bufferSize: cfg.bufferSize,
          sampleRate: cfg.sampleRate,
          pipelineType: pipeType.name,
          offsets: {
            state: STATE_OFFSET,
            audio: audioOffset,
            procTime: procTimeOffset,
          },
        },
      });

      // Handle worker errors
      worker.on("error", (err) => {
        console.error(`Worker error for ${pipeType.name}@${cfg.name}:`, err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(
            `Worker exited with code ${code} for ${pipeType.name}@${cfg.name}`
          );
        }
      });

      // Wait for worker to be ready with timeout + logging
      await new Promise((resolve, reject) => {
        const label = `${pipeType.name}@${cfg.name}`;

        const timeout = setTimeout(() => {
          console.error(`❌ Timeout waiting for worker ready for ${label}`);
          cleanup();
          reject(new Error(`Timeout waiting for worker ready for ${label}`));
        }, 10000); // 10s is plenty for init

        function onMessage(msg) {
          console.log(`Main got worker message from ${label}:`, msg);
          if (msg && msg.type === "ready") {
            clearTimeout(timeout);
            cleanup();
            resolve();
          }
        }

        function onError(err) {
          clearTimeout(timeout);
          console.error(`Worker error during startup for ${label}:`, err);
          cleanup();
          reject(err);
        }

        function onExit(code) {
          clearTimeout(timeout);
          cleanup();
          if (code !== 0) {
            reject(
              new Error(
                `Worker stopped with exit code ${code} during startup for ${label}`
              )
            );
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

      const wakeUpTimes = [];
      const processingTimes = []; // DSP processing times from worker
      const osLatencies = []; // OS timing (Atomics.wait duration)
      const intervals = [];

      let nextAudioTick = performance.now();
      let dropouts = 0;

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        // Signal worker to process
        Atomics.store(sharedState, 0, STATE_PROCESS);
        Atomics.notify(sharedState, 0, 1);

        // Wait for completion
        Atomics.wait(sharedState, 0, STATE_PROCESS);

        // Reset state
        Atomics.store(sharedState, 0, STATE_READY);
      }

      // Main test loop
      for (let i = 0; i < ITERATIONS; i++) {
        // --- Main Thread Noise ---
        randomInterrupt();
        churnMemory();
        const asyncNoise = asyncMicroNoise();
        if (asyncNoise) await asyncNoise;

        // --- Wait for Driver Interrupt ---
        const actualWakeTime = performance.now();
        wakeUpTimes.push(actualWakeTime);

        // Calculate interval
        const interval =
          i > 0 ? actualWakeTime - wakeUpTimes[i - 1] : cfg.duration;
        intervals.push(interval);

        // --- Signal Worker to Process ---
        Atomics.store(sharedState, 0, STATE_PROCESS);
        Atomics.notify(sharedState, 0, 1);

        // --- Wait for Completion with Timeout ---
        const startWait = performance.now();
        const timeoutMs = cfg.duration;
        const result = Atomics.wait(sharedState, 0, STATE_PROCESS, timeoutMs);
        const endWait = performance.now();
        const osLatency = endWait - startWait;

        if (result === "timed-out") {
          // Hardware dropout - worker missed deadline
          dropouts++;
          osLatencies.push(timeoutMs); // Record as max OS latency
          processingTimes.push(timeoutMs); // Record as DSP timeout (shouldn't happen)
        } else {
          // Worker completed in time
          osLatencies.push(osLatency);
          const procTime = procTimeView[0];
          processingTimes.push(procTime);
        }

        // Schedule next block
        nextAudioTick += cfg.duration;
      }

      worker.terminate();

      const dspStats = percentiles(processingTimes);
      const osStats = percentiles(osLatencies);
      const osJitter = calculateJitter(osLatencies);

      // Headroom calculation (OS timing vs budget)
      const headroom = cfg.duration - osStats.avg;
      const headroomPercent = (headroom / cfg.duration) * 100;

      const avgProc = dspStats.avg;
      const maxProc = dspStats.max;
      const procDropouts = processingTimes.filter(
        (t) => t > cfg.duration
      ).length;

      results.push({
        pipeline: pipeType.name,
        config: cfg.name,

        // DSP Stats (Processing in worker thread)
        proc_avg_ms: avgProc,
        proc_max_ms: maxProc,
        proc_dropouts: procDropouts,

        // OS Stats (Main thread timing)
        avg_ms: osStats.avg,
        p50_ms: osStats.p50,
        p95_ms: osStats.p95,
        p99_ms: osStats.p99,
        max_ms: osStats.max,
        jitter_avg_ms: osJitter.avgJitter,
        jitter_max_ms: osJitter.maxJitter,
        headroom_ms: headroom,
        headroom_percent: headroomPercent,
        dropouts, // Hardware dropouts (missed deadlines)
      });
    }
  }

  cpuNoiseStop();
  saveJSON("audio-latency-threaded", results);

  console.log("\n\n🔥 Worker Thread Stress-test complete!");
  console.log("📁 Saved: audio-latency-threaded.json\n");
})().catch((e) => {
  console.error("FATAL BENCHMARK ERROR:", e);
  process.exit(1);
});
