/**
 * DSP Worker Thread - Batch Signal Processing
 *
 * Creates pipeline ONCE at startup (like audio-worker.js).
 * Filter config passed via workerData, NOT via message (to avoid V8 HandleScope issues).
 * Each worker has its own native addon instance.
 */
import { parentPort, workerData } from "node:worker_threads";
import { createDspPipeline } from "dspx";

// Error handling
process.on("uncaughtException", (err) => {
  process.stderr.write(`CRITICAL WORKER ERROR: ${err.message}\n`);
  setTimeout(() => process.exit(1), 100);
});

// Create pipeline ONCE at module level (synchronous startup)
let pipeline = null;

try {
  pipeline = createDspPipeline();

  // Configure filter at startup using workerData (if provided)
  if (workerData && workerData.filterConfig) {
    pipeline.filter(workerData.filterConfig);
  }

  // Configure convolution at startup using workerData (if provided)
  if (workerData && workerData.convolutionConfig) {
    const { kernel, mode } = workerData.convolutionConfig;
    pipeline.convolution({ kernel, mode: mode || "batch" });
  }

  parentPort.postMessage({ type: "ready" });
} catch (error) {
  process.stderr.write(`WORKER INIT ERROR: ${error.message}\n`);
  process.stderr.write(`Stack trace: ${error.stack}\n`);
  setTimeout(() => process.exit(1), 100);
}

// Message handler
parentPort.on("message", async (msg) => {
  try {
    switch (msg.type) {
      case "firFilterBatch":
        await processFirFilterBatch(msg);
        break;
      case "convolutionBatch":
        await processConvolutionBatch(msg);
        break;
      default:
        throw new Error(`Unknown task type: ${msg.type}`);
    }
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      message: error.message,
      stack: error.stack,
    });
  }
});

/**
 * Process multiple signals with FIR filter in batch
 * Assumes filter is already configured via workerData at startup
 */
async function processFirFilterBatch(msg) {
  const {
    sharedInput,
    sharedOutput,
    syncBuffer,
    batchStart,
    batchEnd,
    signalLength,
    sampleRate,
  } = msg;

  try {
    const input = new Float32Array(sharedInput);
    const output = new Float32Array(sharedOutput);

    // Process each signal in this worker's batch
    for (let batchIdx = batchStart; batchIdx < batchEnd; batchIdx++) {
      const signalStart = batchIdx * signalLength;
      const signalEnd = signalStart + signalLength;

      // Extract signal for this batch item
      const signal = input.subarray(signalStart, signalEnd);

      // Process with native addon (zero-copy via SharedArrayBuffer view)
      const result = pipeline.processSync(signal, {
        sampleRate,
        channels: 1,
      });

      // Write back to shared output
      output.set(result, signalStart);
    }

    // Signal completion (no dispose - pipeline lives for worker lifetime)
    const sync = new Int32Array(syncBuffer);
    Atomics.add(sync, 0, 1);
    Atomics.notify(sync, 0, 1);
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      message: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Process multiple convolutions in batch
 * Assumes convolution is already configured via workerData at startup
 */
async function processConvolutionBatch(msg) {
  const {
    sharedInput,
    sharedOutput,
    syncBuffer,
    batchStart,
    batchEnd,
    signalLength,
    outputLength,
    sampleRate,
  } = msg;

  try {
    // Reuse pipeline configured with convolution stage
    const input = new Float32Array(sharedInput);
    const output = new Float32Array(sharedOutput);

    // Process each signal in batch
    for (let batchIdx = batchStart; batchIdx < batchEnd; batchIdx++) {
      const signalStart = batchIdx * signalLength;
      const signal = input.subarray(signalStart, signalStart + signalLength);

      // Process with pre-configured convolution pipeline
      const result = pipeline.processSync(signal, {
        sampleRate,
        channels: 1,
      });

      // Write to output
      const outputStart = batchIdx * outputLength;
      output.set(result, outputStart);
    }

    // Signal completion (no dispose - pipeline lives for worker lifetime)
    const sync = new Int32Array(syncBuffer);
    Atomics.add(sync, 0, 1);
    Atomics.notify(sync, 0, 1);
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      message: error.message,
      stack: error.stack,
    });
  }
}
