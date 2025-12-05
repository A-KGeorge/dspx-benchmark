/**
 * concurrency-worker.js
 *
 * Worker script for the threaded concurrency benchmark.
 * Mirrors audio-worker.js but removes the audio loop behaviour.
 *
 * Runs synchronous DSP on shared memory:
 *   state: 0 = idle, 1 = process, 2 = done
 *
 * Source reference: audio-worker.js (from user)
 */

import { parentPort, workerData } from "node:worker_threads";
import { createDspPipeline } from "dspx";
import { performance } from "node:perf_hooks";

// Destructure worker data
const { sharedBuffer, bufferSize, sampleRate, offsets } = workerData;

// Shared buffers
const sharedState = new Int32Array(sharedBuffer, offsets.state, 1);
const sharedFloatArray = new Float32Array(
  sharedBuffer,
  offsets.audio,
  bufferSize
);
const procTimeArray = new Float64Array(sharedBuffer, offsets.procTime, 1);

// -----------------------------------------------------------------------------
// DSP Pipeline (always "complex" for concurrency tests)
// -----------------------------------------------------------------------------
const pipeline = createDspPipeline();

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

// Notify parent thread that worker is initialized
parentPort.postMessage({ type: "ready" });

// // Clean up on exit
// process.on("exit", () => {
//   pipeline.dispose();
// });

// -----------------------------------------------------------------------------
// Main synchronous processing loop
// -----------------------------------------------------------------------------
function loop() {
  while (true) {
    const state = Atomics.load(sharedState, 0);

    if (state === 0) {
      // Idle: wait until state becomes non-zero
      Atomics.wait(sharedState, 0, 0);
      continue;
    }

    if (state === 2) {
      // Done: main hasn't reset yet
      Atomics.wait(sharedState, 0, 2);
      continue;
    }

    if (state === 1) {
      // PROCESS NOW
      const start = performance.now();

      const output = pipeline.processSync(sharedFloatArray, {
        sampleRate,
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

      // Signal completion
      Atomics.store(sharedState, 0, 2);
      Atomics.notify(sharedState, 0, 1);
    }
  }
}

loop();
