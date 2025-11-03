/**
 * Generate charts from benchmark results
 */

import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { getMachineSpecs, loadJSON, getPlatformId } from "./common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const width = 1000;
const height = 700;
const chartCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "white",
});

const specs = getMachineSpecs();
const platformId = getPlatformId();
const subtitle = `${specs.cpu} • ${specs.arch} • Node ${specs.node} • RAM ${specs.ram}`;

console.log(`📊 Generating charts for platform: ${platformId}\n`);

// Ensure charts directory exists (platform-specific)
const chartsDir = path.join(__dirname, "charts", platformId);
fs.mkdirSync(chartsDir, { recursive: true });

// ============================================================================
// Story 1: FFT Throughput
// ============================================================================

console.log("📈 Chart 1: FFT Throughput...");

const story1Data = loadJSON("raw-speed");
if (story1Data) {
  const fftResults = story1Data.filter((r) => r.test === "fft");
  const inputSizes = ["small", "medium", "large"];
  const libraries = [...new Set(fftResults.map((r) => r.lib))];

  const datasets = libraries.map((lib) => {
    const libData = inputSizes.map((size) => {
      const result = fftResults.find((r) => r.lib === lib && r.input === size);
      return result ? result.throughput : 0;
    });

    return {
      label: lib,
      data: libData,
      borderWidth: 3,
      tension: 0.1,
    };
  });

  const config = {
    type: "line",
    data: {
      labels: inputSizes.map((s) => s.toUpperCase()),
      datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "FFT Throughput: dspx vs TensorFlow.js vs fft.js",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle,
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 14 } },
        },
      },
      scales: {
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Throughput (samples/sec)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
        x: {
          title: {
            display: true,
            text: "Input Size",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "fft_throughput.png"), buffer);
  console.log("   ✓ Saved: charts/fft_throughput.png");
}

// ============================================================================
// Story 1: FIR Filter Throughput
// ============================================================================

console.log("📈 Chart 2: FIR Filter Throughput...");

if (story1Data) {
  const firResults = story1Data.filter((r) => r.test === "fir_filter");
  const inputSizes = ["small", "medium", "large"];
  const libraries = [...new Set(firResults.map((r) => r.lib))];

  const datasets = libraries.map((lib) => {
    const libData = inputSizes.map((size) => {
      const result = firResults.find((r) => r.lib === lib && r.input === size);
      return result ? result.throughput : 0;
    });

    return {
      label: lib,
      data: libData,
      borderWidth: 3,
      tension: 0.1,
    };
  });

  const config = {
    type: "line",
    data: {
      labels: inputSizes.map((s) => s.toUpperCase()),
      datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "FIR Filter Throughput: dspx vs fili vs dsp.js",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle,
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 14 } },
        },
      },
      scales: {
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Throughput (samples/sec)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
        x: {
          title: {
            display: true,
            text: "Input Size",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "fir_throughput.png"), buffer);
  console.log("   ✓ Saved: charts/fir_throughput.png");
}

// ============================================================================
// Story 1: Convolution Throughput (Kernel Size Scaling)
// ============================================================================

console.log("📈 Chart 3: Convolution Throughput (Kernel Scaling)...");

if (story1Data) {
  const convResults = story1Data.filter((r) => r.test === "conv1d");
  const kernelSizes = [...new Set(convResults.map((r) => r.kernel_size))].sort(
    (a, b) => a - b
  );
  const libraries = [...new Set(convResults.map((r) => r.lib))];

  const datasets = libraries.map((lib) => {
    const libData = kernelSizes.map((size) => {
      const result = convResults.find(
        (r) => r.lib === lib && r.kernel_size === size
      );
      return result ? result.throughput : 0;
    });

    return {
      label: lib,
      data: libData,
      borderWidth: 3,
      tension: 0.1,
    };
  });

  const config = {
    type: "line",
    data: {
      labels: kernelSizes.map((s) => `K=${s}`),
      datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "1D Convolution Throughput: dspx vs TensorFlow.js vs Naive JS",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • dspx uses FFT for kernel > 64 (moving mode)",
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 14 } },
        },
      },
      scales: {
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Throughput (samples/sec)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
        x: {
          title: {
            display: true,
            text: "Kernel Size",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "convolution_throughput.png"), buffer);
  console.log("   ✓ Saved: charts/convolution_throughput.png");
}

// ============================================================================
// Story 2: Moving Average O(1) vs O(N)
// ============================================================================

console.log("📈 Chart 4: Moving Average Scaling...");

const story2Data = loadJSON("algorithmic");
if (story2Data) {
  const windowSizes = [32, 128, 512, 2048, 8192];

  // Create separate charts for each input size
  for (const inputSize of ["small", "medium"]) {
    const sizeResults = story2Data.filter((r) => r.input === inputSize);

    if (sizeResults.length === 0) continue;

    const dspxData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "dspx" && r.windowSize === ws
      );
      return result ? result.avg_ms : null;
    });

    const naiveData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "naive_js" && r.windowSize === ws
      );
      return result ? result.avg_ms : null;
    });

    const config = {
      type: "line",
      data: {
        labels: windowSizes,
        datasets: [
          {
            label: "dspx (O(1) circular buffer)",
            data: dspxData,
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderWidth: 3,
            tension: 0.1,
          },
          {
            label: "naive JS (O(N·W) sliding window)",
            data: naiveData,
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderWidth: 3,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `Moving Average: O(1) vs O(N·W) — ${inputSize.toUpperCase()} input`,
            font: { size: 20, weight: "bold" },
          },
          subtitle: {
            display: true,
            text: subtitle,
            font: { size: 14 },
            padding: { bottom: 20 },
          },
          legend: {
            display: true,
            position: "top",
            labels: { font: { size: 14 } },
          },
        },
        scales: {
          y: {
            title: {
              display: true,
              text: "Time (ms)",
              font: { size: 14 },
            },
            ticks: { font: { size: 12 } },
          },
          x: {
            title: {
              display: true,
              text: "Window Size",
              font: { size: 14 },
            },
            ticks: { font: { size: 12 } },
          },
        },
      },
    };

    const buffer = await chartCanvas.renderToBuffer(config);
    fs.writeFileSync(
      path.join(chartsDir, `moving_avg_${inputSize}.png`),
      buffer
    );
    console.log(`   ✓ Saved: charts/moving_avg_${inputSize}.png`);
  }
}

// ============================================================================
// Story 3: Redis State Persistence
// ============================================================================

console.log("📈 Chart 5: State Save/Load Latency...");

const story3Data = loadJSON("redis");
if (story3Data) {
  const inputSizes = story3Data.map((r) => r.input.toUpperCase());
  const saveTimes = story3Data.map((r) => r.save_ms);
  const loadTimes = story3Data.map((r) => r.load_ms);
  const seamlessMarkers = story3Data.map((r) => (r.seamless ? "✓" : "✗"));

  const config = {
    type: "bar",
    data: {
      labels: inputSizes,
      datasets: [
        {
          label: "Save State",
          data: saveTimes,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 2,
        },
        {
          label: "Load State",
          data: loadTimes,
          backgroundColor: "rgba(255, 206, 86, 0.6)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "State Persistence Latency (FirFilter → RMS Pipeline)",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + ` • Seamless: ${seamlessMarkers.join(", ")}`,
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 14 } },
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "Time (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Input Size",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "redis_latency.png"), buffer);
  console.log("   ✓ Saved: charts/redis_latency.png");
}

// ============================================================================
// Story 4: Logging Performance
// ============================================================================

console.log("📈 Chart 6: Logging Performance...");

const story4Data = loadJSON("logging");
if (story4Data) {
  const modes = ["none", "batched", "per-message", "console"];
  const inputSizes = ["medium", "large"];

  const datasets = inputSizes.map((size, idx) => {
    const sizeResults = story4Data.filter((r) => r.input === size);
    const throughputs = modes.map((mode) => {
      const result = sizeResults.find((r) => r.mode === mode);
      return result ? result.throughput : 0;
    });

    const colors = ["rgba(75, 192, 192, 0.6)", "rgba(255, 159, 64, 0.6)"];

    return {
      label: size.toUpperCase(),
      data: throughputs,
      backgroundColor: colors[idx],
      borderColor: colors[idx].replace("0.6", "1"),
      borderWidth: 2,
    };
  });

  const config = {
    type: "bar",
    data: {
      labels: modes,
      datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Logging Mode Performance Impact",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle,
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 14 } },
        },
      },
      scales: {
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Throughput (samples/sec)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
        x: {
          title: {
            display: true,
            text: "Logging Mode",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "logging_perf.png"), buffer);
  console.log("   ✓ Saved: charts/logging_perf.png");
}

console.log("\n✅ All charts generated successfully!\n");
