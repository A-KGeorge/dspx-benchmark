/**
 * Parallel processing utilities using worker_threads
 *
 * Batch processing: Processes multiple independent signals in parallel.
 * Each worker creates its own dspx pipeline instance (following audio-worker.js pattern).
 * Uses SharedArrayBuffer and Atomics for synchronization.
 */
import { Worker } from "node:worker_threads";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkNodeVersion } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Thread pool for parallel DSP processing
 */
export class DspThreadPool {
  constructor(numThreads = null) {
    // Auto-detect core count, but be conservative to avoid thermal issues on ARM
    const maxThreads = os.cpus().length;
    this.numThreads = numThreads || Math.max(1, Math.floor(maxThreads * 0.75));

    // Check if running on ARM/sandboxed environment
    this.isARM = process.arch === "arm64" || process.arch === "arm";
    if (this.isARM) {
      // Be more conservative on ARM (thermal throttling, power management)
      this.numThreads = Math.min(this.numThreads, 4);
    }

    this.workers = [];
    this.workerPath = path.join(__dirname, "dsp-worker.js");
    this.taskIdCounter = 0;
    this.initialized = false;
  }

  /**
   * Initialize worker pool with optional configuration
   * @param {Object} config - Optional configuration object
   * @param {Object} config.filterConfig - Filter configuration for FIR filtering
   * @param {Object} config.convolutionConfig - Convolution configuration (kernel + mode)
   */
  async init(config = null) {
    if (this.initialized) return;

    // Check Node.js version
    const versionCheck = checkNodeVersion();
    if (!versionCheck.compatible) {
      throw new Error(
        `Parallel processing requires Node.js 16+. Current: ${versionCheck.version}. ${versionCheck.reason}`,
      );
    }

    // Check if SharedArrayBuffer is available
    if (typeof SharedArrayBuffer === "undefined") {
      throw new Error(
        `SharedArrayBuffer not available. Detected Node.js ${versionCheck.version}. ` +
          `This should be supported by default in Node.js 16+. ` +
          `Please update Node.js or check your environment configuration.` +
          "SharedArrayBuffer not available. Run with --enable-shared-array-buffer flag.",
      );
    }

    // Create workers sequentially and wait for each to be ready
    for (let i = 0; i < this.numThreads; i++) {
      // Pass config via workerData to avoid V8 HandleScope issues
      const worker = new Worker(this.workerPath, {
        workerData: config || null,
      });

      // Attach persistent error handler
      worker.on("error", (err) => {
        console.error(`Worker ${i} error:`, err);
      });

      // Attach persistent message handler for errors
      worker.on("message", (msg) => {
        if (msg && msg.type === "error") {
          console.error(`Worker ${i} message error:`, msg.message);
        }
      });

      // Wait for worker to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Worker ${i} initialization timeout`));
        }, 5000);

        const onMessage = (msg) => {
          if (msg && msg.type === "ready") {
            clearTimeout(timeout);
            cleanup();
            resolve();
          }
        };

        const onError = (err) => {
          clearTimeout(timeout);
          cleanup();
          reject(err);
        };

        function cleanup() {
          worker.off("message", onMessage);
          worker.off("error", onError);
        }

        worker.on("message", onMessage);
        worker.on("error", onError);
      });

      this.workers.push(worker);
    }

    this.initialized = true;
  }

  /**
   * Process batch of signals with FIR filter in parallel
   * Each worker processes a subset of signals (not chunks of one signal)
   *
   * @param {Float32Array[]} signals - Array of signals to process
   * @param {Object} filterConfig - Filter configuration
   * @param {number} sampleRate - Sample rate
   * @returns {Promise<Float32Array[]>} Array of filtered signals
   */
  async processFirFilterParallel(signals, filterConfig, sampleRate) {
    // Initialize with filter config if not already initialized
    if (!this.initialized) {
      await this.init({ filterConfig });
    }

    const batchSize = signals.length;
    const signalLength = signals[0].length;

    // Validate all signals same length
    if (!signals.every((s) => s.length === signalLength)) {
      throw new Error("All signals must have the same length");
    }

    // Create SharedArrayBuffers for batch
    const totalSamples = batchSize * signalLength;
    const sharedInput = new SharedArrayBuffer(totalSamples * 4);
    const sharedOutput = new SharedArrayBuffer(totalSamples * 4);
    const syncBuffer = new SharedArrayBuffer(4);

    // Copy all signals to shared input
    const inputView = new Float32Array(sharedInput);
    for (let i = 0; i < batchSize; i++) {
      inputView.set(signals[i], i * signalLength);
    }

    // Initialize sync counter
    const syncView = new Int32Array(syncBuffer);
    Atomics.store(syncView, 0, 0);

    // Distribute signals across workers
    const signalsPerWorker = Math.ceil(batchSize / this.numThreads);
    const numWorkersUsed = Math.ceil(batchSize / signalsPerWorker);

    for (let i = 0; i < numWorkersUsed; i++) {
      const batchStart = i * signalsPerWorker;
      const batchEnd = Math.min((i + 1) * signalsPerWorker, batchSize);

      if (batchStart >= batchSize) break;

      const worker = this.workers[i % this.workers.length];

      worker.postMessage({
        type: "firFilterBatch",
        sharedInput,
        sharedOutput,
        syncBuffer,
        batchStart,
        batchEnd,
        signalLength,
        sampleRate,
      });
    }

    // Wait for all workers to complete using Atomics
    // Use setImmediate for responsive polling (much faster than setTimeout)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Parallel FIR filter timed out after 30s`));
      }, 30000);

      const checkCompletion = () => {
        if (Atomics.load(syncView, 0) >= numWorkersUsed) {
          clearTimeout(timeout);
          resolve();
        } else {
          setImmediate(checkCompletion);
        }
      };
      checkCompletion();
    });

    // Extract results
    const outputView = new Float32Array(sharedOutput);
    const results = [];
    for (let i = 0; i < batchSize; i++) {
      results.push(outputView.slice(i * signalLength, (i + 1) * signalLength));
    }

    return results;
  }

  /**
   * Process batch of convolutions in parallel
   * Each worker processes a subset of signals with the same kernel
   *
   * @param {Float32Array[]} signals - Array of signals
   * @param {Float32Array} kernel - Convolution kernel (same for all)
   * @param {string} mode - 'batch' (stateless) or 'moving' (stateful) [default: 'batch']
   * @param {number} sampleRate - Sample rate [default: 1000]
   * @returns {Promise<Float32Array[]>} Array of convolved signals
   */
  async processConvolutionParallel(
    signals,
    kernel,
    mode = "batch",
    sampleRate = 1000,
  ) {
    // Initialize with convolution config if not already initialized
    if (!this.initialized) {
      await this.init({ convolutionConfig: { kernel, mode } });
    }

    const batchSize = signals.length;
    const signalLength = signals[0].length;
    const kernelSize = kernel.length;

    // Validate
    if (!signals.every((s) => s.length === signalLength)) {
      throw new Error("All signals must have the same length");
    }

    // Calculate output length based on mode
    const outputLength =
      mode === "batch" ? signalLength - kernelSize + 1 : signalLength;

    // Create SharedArrayBuffers
    const totalInputSamples = batchSize * signalLength;
    const totalOutputSamples = batchSize * outputLength;
    const sharedInput = new SharedArrayBuffer(totalInputSamples * 4);
    const sharedOutput = new SharedArrayBuffer(totalOutputSamples * 4);
    const syncBuffer = new SharedArrayBuffer(4);

    // Copy input data
    const inputView = new Float32Array(sharedInput);
    for (let i = 0; i < batchSize; i++) {
      inputView.set(signals[i], i * signalLength);
    }

    // Initialize sync
    const syncView = new Int32Array(syncBuffer);
    Atomics.store(syncView, 0, 0);

    // Distribute across workers
    const signalsPerWorker = Math.ceil(batchSize / this.numThreads);
    const numWorkersUsed = Math.ceil(batchSize / signalsPerWorker);

    for (let i = 0; i < numWorkersUsed; i++) {
      const batchStart = i * signalsPerWorker;
      const batchEnd = Math.min((i + 1) * signalsPerWorker, batchSize);

      if (batchStart >= batchSize) break;

      const worker = this.workers[i % this.workers.length];

      worker.postMessage({
        type: "convolutionBatch",
        sharedInput,
        sharedOutput,
        syncBuffer,
        batchStart,
        batchEnd,
        signalLength,
        outputLength,
        sampleRate,
      });
    }

    // Wait for completion using Atomics
    // Use setImmediate for responsive polling (much faster than setTimeout)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Parallel convolution timed out after 30s`));
      }, 30000);

      const checkCompletion = () => {
        if (Atomics.load(syncView, 0) >= numWorkersUsed) {
          clearTimeout(timeout);
          resolve();
        } else {
          setImmediate(checkCompletion);
        }
      };
      checkCompletion();
    });

    // Extract results
    const outputView = new Float32Array(sharedOutput);
    const results = [];
    for (let i = 0; i < batchSize; i++) {
      results.push(outputView.slice(i * outputLength, (i + 1) * outputLength));
    }

    return results;
  }

  /**
   * Terminate all workers
   */
  async terminate() {
    const promises = this.workers.map((worker) => worker.terminate());
    await Promise.all(promises);
    this.workers = [];
    this.initialized = false;
  }
}

/**
 * Check if parallel processing is available and recommended
 */
export function isParallelAvailable() {
  // Check Node.js version first
  const versionCheck = checkNodeVersion();
  if (!versionCheck.compatible) {
    return {
      available: false,
      reason: `Node.js ${versionCheck.version} is too old (need 16+)`,
    };
  }

  // Check SharedArrayBuffer support
  if (typeof SharedArrayBuffer === "undefined") {
    return {
      available: false,
      reason:
        "SharedArrayBuffer not supported (should be available in Node 16+)",
    };
  }

  // Check if we have multiple cores
  const cores = os.cpus().length;
  if (cores < 2) {
    return {
      available: false,
      reason: "Single core system",
    };
  }

  // Check for ARM-specific limitations
  const isARM = process.arch === "arm64" || process.arch === "arm";
  if (isARM) {
    return {
      available: true,
      reason: "ARM detected - using conservative threading (max 4 threads)",
      maxThreads: Math.min(cores, 4),
    };
  }

  return {
    available: true,
    reason: `${cores} cores detected`,
    maxThreads: Math.floor(cores * 0.75),
  };
}
