/**
 * latency-worker.js
 *
 * Worker script for the threaded latency benchmark.
 * Mirrors audio-worker.js but focused on measuring individual DSP processing latencies.
 *
 * Runs synchronous DSP on shared memory:
 *   state: 0 = idle, 1 = process, 2 = done
 *
 * Measures and stores processing time in procTimeArray[0].
 */

import { parentPort, workerData } from "node:worker_threads";
import { createDspPipeline } from "dspx";
import { performance } from "node:perf_hooks";

// 1. GLOBAL ERROR TRAP (Catch silent failures)
process.on("uncaughtException", (err) => {
  process.stderr.write(`CRITICAL WORKER ERROR: ${err.message}\n`);
  setTimeout(() => process.exit(1), 100);
});

console.log("Worker script started");

// Declare variables in outer scope
let sharedState,
  sharedFloatArray,
  procTimeArray,
  pipeline,
  sampleRate,
  bufferSize;

try {
  if (!workerData) {
    throw new Error("Worker must be run as a worker thread with workerData");
  }

  // Debug logging - use console.error to ensure it flushes if crash is imminent
  // We inspect just the keys to avoid dumping a massive SharedArrayBuffer to console
  console.log("workerData keys:", Object.keys(workerData));
  console.log("workerData values:", {
    sharedBuffer: typeof workerData.sharedBuffer,
    bufferSize: workerData.bufferSize,
    sampleRate: workerData.sampleRate,
    offsets: workerData.offsets,
  });

  const {
    sharedBuffer,
    bufferSize: bufSize,
    sampleRate: sr,
    offsets,
  } = workerData;

  console.log(
    "Destructuring successful, sharedBuffer type:",
    sharedBuffer?.constructor?.name
  );

  bufferSize = bufSize;
  sampleRate = sr;

  console.log("About to log destructured message");

  console.log(
    "Worker data destructured successfully, bufferSize:",
    bufferSize,
    "offsets keys:",
    Object.keys(offsets)
  );

  console.log("Creating shared views...");
  if (!(sharedBuffer instanceof SharedArrayBuffer)) {
    throw new Error(
      `sharedBuffer is not a SharedArrayBuffer, got ${sharedBuffer.constructor.name}`
    );
  }
  sharedState = new Int32Array(sharedBuffer, offsets.state, 1);
  sharedFloatArray = new Float32Array(sharedBuffer, offsets.audio, bufferSize);
  procTimeArray = new Float64Array(sharedBuffer, offsets.procTime, 1);

  console.log("Shared views created successfully");
  pipeline = createDspPipeline(); // If dspx fails, this throws
  console.log("Pipeline created successfully");

  // Configure pipeline (same as profiling: FIR filter + RMS)
  pipeline
    .filter({
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: 3000,
      sampleRate: sampleRate,
      order: 51,
      windowType: "hamming",
    })
    .Rms({ mode: "moving", windowSize: 100 });

  console.log("Pipeline configured successfully");

  // 3. READY SIGNAL
  console.log("About to send ready message");
  parentPort.postMessage({ type: "ready" });
  console.log("Ready message sent");

  console.log("About to enter processing loop");

  // Clean State Machine Loop
  while (true) {
    // 1. LOAD current state
    const state = Atomics.load(sharedState, 0);

    // 2. IDLE: If state is 0 (Ready/Idle), wait for it to change
    if (state === 0) {
      Atomics.wait(sharedState, 0, 0);
      continue; // Check state again after waking up
    }

    // 3. EXIT: Check for termination signal (optional, but good practice)
    if (state === -1) {
      console.log("Worker received exit signal");
      break;
    }

    // 4. PROCESS: If state is 1 (Process), do the work
    if (state === 1) {
      const start = performance.now();

      // ZERO-COPY: Pass the SharedArrayBuffer view directly.
      const output = pipeline.processSync(sharedFloatArray, {
        sampleRate: sampleRate,
        channels: 1,
      });

      // Copy resized output back if necessary
      if (
        output !== sharedFloatArray &&
        output.length <= sharedFloatArray.length
      ) {
        sharedFloatArray.set(output);
      }

      const end = performance.now();
      procTimeArray[0] = end - start;

      // 5. SIGNAL DONE: Set state back to 0 and wake up Main Thread
      Atomics.store(sharedState, 0, 0);
      Atomics.notify(sharedState, 0, 1);
    }
  }

  console.log("Worker processing loop exited cleanly");

  // Clean up pipeline
  pipeline.dispose();
} catch (error) {
  process.stderr.write(`WORKER INITIALIZATION ERROR: ${error.message}\n`);
  process.stderr.write(`Stack trace: ${error.stack}\n`);
  setTimeout(() => process.exit(1), 100);
}
