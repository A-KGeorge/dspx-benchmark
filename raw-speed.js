/**
 * Story 1 — Raw Computational Speed (C++ vs JS CPU)
 *
 * Benchmarks FFT and FIR filter implementations across:
 * - dspx (native C++ SIMD)
 * - TensorFlow.js (CPU backend)
 * - Pure JavaScript libraries (fft.js, Fili)
 */

import { createDspPipeline, FftProcessor } from "dspx";
import FFT from "fft.js";
import Fili from "fili";
import {
  INPUT_SIZES,
  genSignal,
  getMachineSpecs,
  runTimed,
  saveJSON,
  printResult,
  getSummaryLine,
  ensureDirs,
  loadTensorFlow,
  getPlatformId,
} from "./common.js";

ensureDirs();

console.log("🚀 Story 1 — Raw Computational Speed\n");
console.log("Comparing dspx (C++ SIMD) vs TensorFlow.js vs Pure JS\n");

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

// Load TensorFlow with appropriate backend
const tf = await loadTensorFlow();

// Check Fili availability
let filiAvailable = false;
try {
  const testFili = new Fili.FirFilter([1.0]);
  filiAvailable = true;
  console.log("✓ Fili library loaded\n");
} catch (e) {
  console.log("⚠  Fili not available\n");
}

const results = [];

// ============================================================================
// FFT Benchmarks
// ============================================================================

console.log("=".repeat(80));
console.log("FFT BENCHMARKS");
console.log("=".repeat(80));

for (const size of INPUT_SIZES) {
  const signal = genSignal(size.length, 50, 10000);

  console.log(
    `\n🔬 Testing FFT with ${
      size.name
    } input (${size.length.toLocaleString()} samples)`
  );

  // --- dspx FFT ---
  try {
    const fftProcessor = new FftProcessor(size.length);

    const result = await runTimed(
      "dspx-fft",
      () => {
        return fftProcessor.rfft(signal); // Use rfft for real-valued input
      },
      3,
      10
    );

    const data = {
      test: "fft",
      input: size.name,
      samples: size.length,
      lib: "dspx",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput: (size.length / result.avg) * 1000,
      backend: "CPU (Native C++ SIMD)",
      meta: specs,
    };

    results.push(data);
    printResult(data);
  } catch (e) {
    console.error("❌ dspx FFT failed:", e.message);
  }

  // --- TensorFlow.js FFT ---
  if (tf) {
    try {
      const backendName = platformId.includes("linux-arm64")
        ? "WASM"
        : "Node (C++)";
      const result = await runTimed(
        "tfjs-fft",
        () => {
          const tensor = tf.tensor1d(Array.from(signal));
          const fftResult = tf.spectral.fft(
            tf.complex(tensor, tf.zeros(tensor.shape))
          );
          const output = fftResult.dataSync();
          tensor.dispose();
          fftResult.dispose();
          return output;
        },
        3,
        10
      );

      const data = {
        test: "fft",
        input: size.name,
        samples: size.length,
        lib: "tfjs",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (size.length / result.avg) * 1000,
        backend: `CPU (TensorFlow.js ${backendName})`,
        meta: specs,
      };

      results.push(data);
      printResult(data);
    } catch (e) {
      console.error("❌ TensorFlow.js FFT failed:", e.message);
    }
  } else {
    console.log("⚠️  TensorFlow.js FFT skipped (not available)\n");
  }

  // --- fft.js ---
  try {
    // fft.js requires power-of-2 sizes
    if ((size.length & (size.length - 1)) === 0) {
      const fftjs = new FFT(size.length);
      const input = Array.from(signal);
      const out = fftjs.createComplexArray();

      const result = await runTimed(
        "fftjs",
        () => {
          fftjs.realTransform(out, input);
        },
        3,
        10
      );

      const data = {
        test: "fft",
        input: size.name,
        samples: size.length,
        lib: "fft.js",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (size.length / result.avg) * 1000,
        backend: "CPU (Pure JS)",
        meta: specs,
      };

      results.push(data);
      printResult(data);
    } else {
      console.log("⚠️  fft.js skipped (requires power-of-2 size)");
    }
  } catch (e) {
    console.error("❌ fft.js FFT failed:", e.message);
  }
}

// ============================================================================
// FIR Filter Benchmarks
// ============================================================================

// Naive JavaScript FIR filter implementation
function naiveFirFilter(signal, coefficients) {
  const output = new Float32Array(signal.length);
  const order = coefficients.length;

  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    for (let j = 0; j < order; j++) {
      const sampleIndex = i - j;
      if (sampleIndex >= 0) {
        sum += signal[sampleIndex] * coefficients[j];
      }
    }
    output[i] = sum;
  }

  return output;
}

// Generate FIR lowpass coefficients using windowed sinc method
function generateFirCoefficients(order, cutoffFreq, sampleRate) {
  const M = order;
  const coeffs = new Float32Array(M);
  const fc = cutoffFreq / sampleRate;
  const center = (M - 1) / 2;

  for (let i = 0; i < M; i++) {
    const x = i - center;
    if (x === 0) {
      coeffs[i] = 2 * fc;
    } else {
      // Sinc function with Hamming window
      const sinc = Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
      const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (M - 1));
      coeffs[i] = sinc * hamming;
    }
  }

  return coeffs;
}

console.log("\n" + "=".repeat(80));
console.log("FIR FILTER BENCHMARKS");
console.log("=".repeat(80));

for (const size of INPUT_SIZES) {
  const signal = genSignal(size.length, 50, 10000);
  const filterOrder = 51;
  const cutoffFreq = 2000;
  const sampleRate = 10000;

  console.log(
    `\n🔬 Testing FIR Filter with ${
      size.name
    } input (${size.length.toLocaleString()} samples)`
  );

  // Generate coefficients for Fili and naive implementations
  const coeffs = generateFirCoefficients(filterOrder, cutoffFreq, sampleRate);

  // --- dspx FIR Filter ---
  try {
    const pipeline = createDspPipeline();

    // Add FIR lowpass filter (cutoff at 2000 Hz, order 51)
    pipeline.filter({
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: cutoffFreq,
      sampleRate: sampleRate,
      order: filterOrder,
      windowType: "hamming",
    });

    const result = await runTimed(
      "dspx-fir",
      async () => {
        return await pipeline.process(signal, {
          sampleRate: sampleRate,
          channels: 1,
        });
      },
      3,
      10
    );

    const data = {
      test: "fir_filter",
      input: size.name,
      samples: size.length,
      lib: "dspx",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput: (size.length / result.avg) * 1000,
      backend: "CPU (Native C++ SIMD)",
      filter_order: filterOrder,
      meta: specs,
    };

    results.push(data);
    printResult(data);
  } catch (e) {
    console.error("❌ dspx FIR Filter failed:", e.message);
  }

  // --- Fili FIR Filter ---
  if (filiAvailable) {
    try {
      const filiFilter = new Fili.FirFilter(Array.from(coeffs));

      const result = await runTimed(
        "fili-fir",
        () => {
          const output = new Float32Array(signal.length);
          for (let i = 0; i < signal.length; i++) {
            output[i] = filiFilter.singleStep(signal[i]);
          }
          return output;
        },
        3,
        10
      );

      const data = {
        test: "fir_filter",
        input: size.name,
        samples: size.length,
        lib: "fili",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (size.length / result.avg) * 1000,
        backend: "CPU (Pure JS)",
        filter_order: filterOrder,
        meta: specs,
      };

      results.push(data);
      printResult(data);
    } catch (e) {
      console.error("❌ Fili FIR Filter failed:", e.message);
    }
  }

  // --- Naive JS FIR Filter ---
  try {
    const result = await runTimed(
      "naive-fir",
      () => {
        return naiveFirFilter(signal, coeffs);
      },
      3,
      10
    );

    const data = {
      test: "fir_filter",
      input: size.name,
      samples: size.length,
      lib: "naive_js",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput: (size.length / result.avg) * 1000,
      backend: "CPU (Pure JS)",
      filter_order: filterOrder,
      meta: specs,
    };

    results.push(data);
    printResult(data);
  } catch (e) {
    console.error("❌ Naive JS FIR Filter failed:", e.message);
  }
}

// ============================================================================
// 1D Convolution Benchmarks
// ============================================================================

// Naive JavaScript 1D convolution implementation
function naiveConv1d(signal, kernel) {
  const signalLen = signal.length;
  const kernelLen = kernel.length;
  const outputLen = signalLen - kernelLen + 1;
  const output = new Float32Array(outputLen);

  for (let i = 0; i < outputLen; i++) {
    let sum = 0;
    for (let j = 0; j < kernelLen; j++) {
      sum += signal[i + j] * kernel[j];
    }
    output[i] = sum;
  }

  return output;
}

console.log("\n" + "=".repeat(80));
console.log("1D CONVOLUTION BENCHMARKS (Kernel Size Scaling)");
console.log("=".repeat(80));

const KERNEL_SIZES = [8, 32, 64, 128, 256]; // Test across direct and FFT methods
const CONV_SIGNAL_SIZE = 65536; // Medium size for consistency

console.log(
  "ℹ️  Note: Using batch mode for fair comparison with naive JS. dspx auto-switches to FFT method for kernels > 64.\n"
);

for (const kernelSize of KERNEL_SIZES) {
  const signal = genSignal(CONV_SIGNAL_SIZE, 50, 10000);
  const kernel = new Float32Array(kernelSize).map(() => Math.random());

  console.log(
    `\n🔬 Testing 1D Convolution: signal=${CONV_SIGNAL_SIZE.toLocaleString()}, kernel=${kernelSize}`
  );

  // --- dspx Convolution ---
  try {
    const pipeline = createDspPipeline();

    pipeline.convolution({
      kernel: kernel,
      mode: "batch", // Use batch mode for fair comparison with naive JS
      method: "auto", // Let dspx choose between direct and FFT
    });

    const result = await runTimed(
      "dspx-conv1d",
      async () => {
        return await pipeline.process(signal, {
          sampleRate: 10000,
          channels: 1,
        });
      },
      3,
      10
    );

    const data = {
      test: "conv1d",
      input: `kernel${kernelSize}`,
      samples: CONV_SIGNAL_SIZE,
      signal_size: CONV_SIGNAL_SIZE,
      kernel_size: kernelSize,
      lib: "dspx",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput: (CONV_SIGNAL_SIZE / result.avg) * 1000,
      backend: "CPU (Native C++ SIMD)",
      meta: specs,
    };

    results.push(data);
    printResult(data);
  } catch (e) {
    console.error("❌ dspx Conv1d failed:", e.message);
  }

  // --- TensorFlow.js Conv1d ---
  if (tf) {
    try {
      const backendName = platformId.includes("linux-arm64")
        ? "WASM"
        : "Node (C++)";
      const result = await runTimed(
        "tfjs-conv1d",
        () => {
          // TensorFlow.js conv1d expects [batch, width, channels]
          // Signal: [1, N, 1], Kernel: [kernelSize, 1, 1]
          const signalTensor = tf.reshape(tf.tensor1d(Array.from(signal)), [
            1,
            signal.length,
            1,
          ]);
          const kernelTensor = tf.reshape(tf.tensor1d(Array.from(kernel)), [
            kernelSize,
            1,
            1,
          ]);

          const convResult = tf.conv1d(signalTensor, kernelTensor, 1, "valid");
          const output = convResult.dataSync();

          signalTensor.dispose();
          kernelTensor.dispose();
          convResult.dispose();

          return output;
        },
        3,
        10
      );

      const data = {
        test: "conv1d",
        input: `kernel${kernelSize}`,
        samples: CONV_SIGNAL_SIZE,
        signal_size: CONV_SIGNAL_SIZE,
        kernel_size: kernelSize,
        lib: "tfjs",
        avg_ms: result.avg,
        min_ms: result.min,
        max_ms: result.max,
        throughput: (CONV_SIGNAL_SIZE / result.avg) * 1000,
        backend: `CPU (TensorFlow.js ${backendName})`,
        meta: specs,
      };

      results.push(data);
      printResult(data);
    } catch (e) {
      console.error("❌ TensorFlow.js Conv1d failed:", e.message);
    }
  } else {
    console.log("⚠️  TensorFlow.js Conv1d skipped (not available)\n");
  }

  // --- Naive JS Conv1d ---
  try {
    const result = await runTimed(
      "naive-conv1d",
      () => {
        return naiveConv1d(signal, kernel);
      },
      3,
      10
    );

    const data = {
      test: "conv1d",
      input: `kernel${kernelSize}`,
      samples: CONV_SIGNAL_SIZE,
      signal_size: CONV_SIGNAL_SIZE,
      kernel_size: kernelSize,
      lib: "naive_js",
      avg_ms: result.avg,
      min_ms: result.min,
      max_ms: result.max,
      throughput: (CONV_SIGNAL_SIZE / result.avg) * 1000,
      backend: "CPU (Pure JS)",
      meta: specs,
    };

    results.push(data);
    printResult(data);
  } catch (e) {
    console.error("❌ Naive JS Conv1d failed:", e.message);
  }
}

// Save results
saveJSON("raw-speed", results);
getSummaryLine(results);

console.log("✅ Story 1 benchmarks complete!\n");
