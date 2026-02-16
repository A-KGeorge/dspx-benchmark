/**
 * Regenerate charts for a specific platform from existing JSON results
 * Usage: node regenerate-charts.js [platform-id]
 * Example: node regenerate-charts.js linux-arm64
 */

import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs";
import path from "path";

// Get platform from command line argument or use environment variable
const platformId = process.argv[2] || process.env.BENCHMARK_PLATFORM;

if (!platformId) {
  console.error("❌ Error: Platform identifier required");
  console.error("Usage: node regenerate-charts.js <platform-id>");
  console.error("Example: node regenerate-charts.js linux-arm64");
  process.exit(1);
}

console.log(`📊 Regenerating charts for platform: ${platformId}\n`);

// Check if results exist for this platform
const resultsDir = path.join(process.cwd(), "results", platformId);
if (!fs.existsSync(resultsDir)) {
  console.error(`❌ Error: Results directory not found: ${resultsDir}`);
  console.error(
    `   Run benchmarks first with BENCHMARK_PLATFORM=${platformId}`,
  );
  process.exit(1);
}

// Load results with specific platform
const loadPlatformJSON = (filename) => {
  const filePath = path.join(resultsDir, `${filename}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`✓ Loaded: ${filename}.json`);
    return data;
  } catch (e) {
    console.warn(`⚠️  Could not load ${filename}.json:`, e.message);
    return null;
  }
};

const story1Data = loadPlatformJSON("raw-speed");
const story2Data = loadPlatformJSON("algorithmic");
const story3Data = loadPlatformJSON("persistence");
const story4Data = loadPlatformJSON("logging");
const audioLatencyThreadedData = loadPlatformJSON("audio-latency-threaded");

// Get machine specs from any available result
let specs = {
  cpu: "Unknown",
  arch: "Unknown",
  node: "Unknown",
  ram: "Unknown",
};
if (story1Data && story1Data.length > 0 && story1Data[0].meta) {
  specs = story1Data[0].meta;
} else if (story2Data && story2Data.length > 0 && story2Data[0].meta) {
  specs = story2Data[0].meta;
}

const subtitle = `${specs.cpu} • ${specs.arch} • Node ${specs.node} • RAM ${specs.ram}`;
console.log(`\nMachine specs: ${subtitle}\n`);

// Setup canvas
const width = 1000;
const height = 700;
const chartCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "white",
});

// Ensure charts directory exists (platform-specific)
const chartsDir = path.join(process.cwd(), "charts", platformId);
fs.mkdirSync(chartsDir, { recursive: true });
console.log(`📁 Output directory: ${chartsDir}\n`);

// ============================================================================
// Story 1: FFT Throughput
// ============================================================================

if (story1Data) {
  console.log("📈 Chart 1: FFT Throughput...");

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
          text: "FFT Throughput: Cross-Language Comparison",
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
  console.log("   ✓ Saved: fft_throughput.png");
}

// ============================================================================
// Story 1: FIR Filter Throughput
// ============================================================================

if (story1Data) {
  console.log("📈 Chart 2: FIR Filter Throughput...");

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
          text: "FIR Filter Throughput: Cross-Language Comparison",
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
  console.log("   ✓ Saved: fir_throughput.png");
}

// ============================================================================
// Story 1: Convolution Throughput (Kernel Size Scaling)
// ============================================================================

if (story1Data) {
  console.log("📈 Chart 3: Convolution Throughput (Kernel Scaling)...");

  const convResults = story1Data.filter((r) => r.test === "conv1d");
  const kernelSizes = [...new Set(convResults.map((r) => r.kernel_size))].sort(
    (a, b) => a - b,
  );
  const libraries = [...new Set(convResults.map((r) => r.lib))];

  if (kernelSizes.length > 0) {
    const datasets = libraries.map((lib) => {
      const libData = kernelSizes.map((size) => {
        const result = convResults.find(
          (r) => r.lib === lib && r.kernel_size === size,
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
            text: "1D Convolution Throughput: Cross-Language Comparison",
            font: { size: 20, weight: "bold" },
          },
          subtitle: {
            display: true,
            text: subtitle + " • dspx uses FFT for kernel > 64 (batch mode)",
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
    fs.writeFileSync(
      path.join(chartsDir, "convolution_throughput.png"),
      buffer,
    );
    console.log("   ✓ Saved: convolution_throughput.png");
  } else {
    console.log("   ⚠️  No convolution data found");
  }
}

// ============================================================================
// Story 2: Moving Average O(1) vs O(N)
// ============================================================================

if (story2Data) {
  console.log("📈 Chart 4: Moving Average Scaling...");

  const windowSizes = [32, 128, 512, 2048, 8192];

  // Create separate charts for each input size
  for (const inputSize of ["small", "medium", "large"]) {
    const sizeResults = story2Data.filter((r) => r.input === inputSize);

    if (sizeResults.length === 0) continue;

    const dspxData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "dspx" && r.windowSize === ws,
      );
      return result ? result.avg_ms : null;
    });

    const naiveJSData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "naive_js" && r.windowSize === ws,
      );
      return result ? result.avg_ms : null;
    });

    const scipyData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "scipy" && r.windowSize === ws,
      );
      return result ? result.avg_ms : null;
    });

    const numpyData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "numpy" && r.windowSize === ws,
      );
      return result ? result.avg_ms : null;
    });

    const jdspData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "jdsp" && r.windowSize === ws,
      );
      return result ? result.avg_ms : null;
    });

    const naiveJavaData = windowSizes.map((ws) => {
      const result = sizeResults.find(
        (r) => r.lib === "naive_java" && r.windowSize === ws,
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
            data: naiveJSData,
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderWidth: 3,
            tension: 0.1,
          },
          {
            label: "JDSP (efficient moving average)",
            data: jdspData,
            borderColor: "rgb(255, 206, 86)",
            backgroundColor: "rgba(255, 206, 86, 0.2)",
            borderWidth: 3,
            tension: 0.1,
          },
          {
            label: "scipy (uniform_filter O(1))",
            data: scipyData,
            borderColor: "rgb(153, 102, 255)",
            backgroundColor: "rgba(153, 102, 255, 0.2)",
            borderWidth: 3,
            tension: 0.1,
          },
          {
            label: "numpy (convolve O(N·W))",
            data: numpyData,
            borderColor: "rgb(255, 159, 64)",
            backgroundColor: "rgba(255, 159, 64, 0.2)",
            borderWidth: 3,
            tension: 0.1,
          },
          {
            label: "naive Java (O(N·W) sliding window)",
            data: naiveJavaData,
            borderColor: "rgb(201, 203, 207)",
            backgroundColor: "rgba(201, 203, 207, 0.2)",
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
            text: `Moving Average: Cross-Language O(1) vs O(N·W) — ${inputSize.toUpperCase()} input`,
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
      buffer,
    );
    console.log(`   ✓ Saved: moving_avg_${inputSize}.png`);
  }
}

// ============================================================================
// Story 2b: Moving Average Input Size Scaling (Fixed Window = 2048)
// ============================================================================

if (story2Data) {
  console.log(
    "📈 Chart 4b: Moving Average Input Size Scaling (Window = 2048)...",
  );

  const fixedWindowSize = 2048;
  const windowResults = story2Data.filter(
    (r) => r.windowSize === fixedWindowSize,
  );

  if (windowResults.length > 0) {
    const inputSizes = [...new Set(windowResults.map((r) => r.samples))].sort(
      (a, b) => a - b,
    );
    const libraries = [...new Set(windowResults.map((r) => r.lib))];

    const datasets = libraries.map((lib) => {
      const libData = inputSizes.map((size) => {
        const result = windowResults.find(
          (r) => r.lib === lib && r.samples === size,
        );
        return result ? result.avg_ms : null;
      });

      // Color mapping for different libraries
      const colorMap = {
        dspx: { border: "rgb(75, 192, 192)", bg: "rgba(75, 192, 192, 0.2)" },
        jdsp: { border: "rgb(255, 206, 86)", bg: "rgba(255, 206, 86, 0.2)" },
        naive_js: {
          border: "rgb(255, 99, 132)",
          bg: "rgba(255, 99, 132, 0.2)",
        },
        scipy: { border: "rgb(153, 102, 255)", bg: "rgba(153, 102, 255, 0.2)" },
        numpy: { border: "rgb(255, 159, 64)", bg: "rgba(255, 159, 64, 0.2)" },
        naive_java: {
          border: "rgb(201, 203, 207)",
          bg: "rgba(201, 203, 207, 0.2)",
        },
      };

      const colors = colorMap[lib] || {
        border: "rgb(128, 128, 128)",
        bg: "rgba(128, 128, 128, 0.2)",
      };

      return {
        label: lib,
        data: libData,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderWidth: 3,
        tension: 0.1,
      };
    });

    const config = {
      type: "line",
      data: {
        labels: inputSizes.map((s) => s.toLocaleString()),
        datasets,
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: "Moving Average: Input Size Scaling (Fixed Window = 2048)",
            font: { size: 20, weight: "bold" },
          },
          subtitle: {
            display: true,
            text:
              subtitle + " • All implementations should show linear scaling",
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
              text: "Input Size (samples)",
              font: { size: 14 },
            },
            ticks: { font: { size: 12 } },
          },
        },
      },
    };

    const buffer = await chartCanvas.renderToBuffer(config);
    fs.writeFileSync(
      path.join(chartsDir, "moving_avg_input_scaling.png"),
      buffer,
    );
    console.log("   ✓ Saved: moving_avg_input_scaling.png");
  }
}

// ============================================================================
// Story 3: Redis State Persistence
// ============================================================================

if (story3Data) {
  console.log("📈 Chart 5: State Save/Load Latency...");

  const inputSizes = story3Data.map((r) => r.input.toUpperCase());
  const jsonSerializeTimes = story3Data.map((r) => r.json_serialize_ms);
  const jsonRedisSetTimes = story3Data.map((r) => r.json_redis_set_ms || 0);
  const jsonRedisGetTimes = story3Data.map((r) => r.json_redis_get_ms || 0);
  const jsonDeserializeTimes = story3Data.map((r) => r.json_deserialize_ms);
  const toonSerializeTimes = story3Data.map((r) => r.toon_serialize_ms);
  const toonRedisSetTimes = story3Data.map((r) => r.toon_redis_set_ms || 0);
  const toonRedisGetTimes = story3Data.map((r) => r.toon_redis_get_ms || 0);
  const toonDeserializeTimes = story3Data.map((r) => r.toon_deserialize_ms);

  const config = {
    type: "bar",
    data: {
      labels: inputSizes,
      datasets: [
        {
          label: "JSON Serialize",
          data: jsonSerializeTimes,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
          stack: "json-save",
        },
        {
          label: "JSON Redis SET",
          data: jsonRedisSetTimes,
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
          stack: "json-save",
        },
        {
          label: "JSON Redis GET",
          data: jsonRedisGetTimes,
          backgroundColor: "rgba(75, 192, 192, 0.4)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
          stack: "json-load",
        },
        {
          label: "JSON Deserialize",
          data: jsonDeserializeTimes,
          backgroundColor: "rgba(75, 192, 192, 0.8)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
          stack: "json-load",
        },
        {
          label: "TOON Serialize",
          data: toonSerializeTimes,
          backgroundColor: "rgba(255, 206, 86, 0.8)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 1,
          stack: "toon-save",
        },
        {
          label: "TOON Redis SET",
          data: toonRedisSetTimes,
          backgroundColor: "rgba(255, 206, 86, 0.4)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 1,
          stack: "toon-save",
        },
        {
          label: "TOON Redis GET",
          data: toonRedisGetTimes,
          backgroundColor: "rgba(255, 159, 64, 0.4)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
          stack: "toon-load",
        },
        {
          label: "TOON Deserialize",
          data: toonDeserializeTimes,
          backgroundColor: "rgba(255, 159, 64, 0.8)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
          stack: "toon-load",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "State Persistence Breakdown: Serialization + Redis (Stacked)",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • FirFilter → RMS Pipeline",
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 12 } },
        },
      },
      scales: {
        y: {
          stacked: true,
          title: {
            display: true,
            text: "Time (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          stacked: true,
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
  fs.writeFileSync(path.join(chartsDir, "persistence_latency.png"), buffer);
  console.log("   ✓ Saved: persistence_latency.png");
}

// ============================================================================
// Story 3b: Python State Persistence
// ============================================================================

const story3bData = loadPlatformJSON("persistence-python");
if (story3bData) {
  console.log("📈 Chart 5b: State Save/Load Latency (Python)...");

  const inputSizes = story3bData.map((r) => r.input.toUpperCase());
  const jsonSerializeTimes = story3bData.map((r) => r.json_serialize_ms);
  const jsonRedisSetTimes = story3bData.map((r) => r.json_redis_set_ms || 0);
  const jsonRedisGetTimes = story3bData.map((r) => r.json_redis_get_ms || 0);
  const jsonDeserializeTimes = story3bData.map((r) => r.json_deserialize_ms);
  const binSerializeTimes = story3bData.map((r) => r.pickle_serialize_ms);
  const binRedisSetTimes = story3bData.map((r) => r.pickle_redis_set_ms || 0);
  const binRedisGetTimes = story3bData.map((r) => r.pickle_redis_get_ms || 0);
  const binDeserializeTimes = story3bData.map((r) => r.pickle_deserialize_ms);

  const config = {
    type: "bar",
    data: {
      labels: inputSizes,
      datasets: [
        {
          label: "JSON Serialize",
          data: jsonSerializeTimes,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
          stack: "json-save",
        },
        {
          label: "JSON Redis SET",
          data: jsonRedisSetTimes,
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
          stack: "json-save",
        },
        {
          label: "JSON Redis GET",
          data: jsonRedisGetTimes,
          backgroundColor: "rgba(75, 192, 192, 0.4)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
          stack: "json-load",
        },
        {
          label: "JSON Deserialize",
          data: jsonDeserializeTimes,
          backgroundColor: "rgba(75, 192, 192, 0.8)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
          stack: "json-load",
        },
        {
          label: "Pickle Serialize",
          data: binSerializeTimes,
          backgroundColor: "rgba(255, 206, 86, 0.8)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 1,
          stack: "bin-save",
        },
        {
          label: "Pickle Redis SET",
          data: binRedisSetTimes,
          backgroundColor: "rgba(255, 206, 86, 0.4)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 1,
          stack: "bin-save",
        },
        {
          label: "Pickle Redis GET",
          data: binRedisGetTimes,
          backgroundColor: "rgba(255, 159, 64, 0.4)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
          stack: "bin-load",
        },
        {
          label: "Pickle Deserialize",
          data: binDeserializeTimes,
          backgroundColor: "rgba(255, 159, 64, 0.8)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
          stack: "bin-load",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Python State Persistence Breakdown: Serialization + Redis (Stacked)",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • Python scipy Pipeline",
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 12 } },
        },
      },
      scales: {
        y: {
          stacked: true,
          title: {
            display: true,
            text: "Time (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          stacked: true,
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
  fs.writeFileSync(
    path.join(chartsDir, "persistence_latency_python.png"),
    buffer,
  );
  console.log("   ✓ Saved: persistence_latency_python.png");
}

// ============================================================================
// Story 3c: JSON Serialization/Deserialization
// ============================================================================

console.log("📈 Chart 5c: JSON Serialization/Deserialization...");

if (story3Data && story3bData) {
  const inputSizes = story3Data.map((r) => r.input.toUpperCase());

  const jsJsonSerialize = story3Data.map((r) => r.json_serialize_ms);
  const jsJsonDeserialize = story3Data.map((r) => r.json_deserialize_ms);
  const pyJsonSerialize = story3bData.map((r) => r.json_serialize_ms);
  const pyJsonDeserialize = story3bData.map((r) => r.json_deserialize_ms);

  const jsToonSerialize = story3Data.map((r) => r.toon_serialize_ms);
  const jsToonDeserialize = story3Data.map((r) => r.toon_deserialize_ms);
  const pyPickleSerialize = story3bData.map((r) => r.pickle_serialize_ms);
  const pyPickleDeserialize = story3bData.map((r) => r.pickle_deserialize_ms);

  const allData = [
    ...jsJsonSerialize,
    ...jsJsonDeserialize,
    ...pyJsonSerialize,
    ...pyJsonDeserialize,
    ...jsToonSerialize,
    ...jsToonDeserialize,
    ...pyPickleSerialize,
    ...pyPickleDeserialize,
  ];
  const maxY = Math.max(...allData) * 1.1;

  const config = {
    data: {
      labels: inputSizes,
      datasets: [
        {
          type: "bar",
          label: "JS JSON Serialize",
          data: jsJsonSerialize,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
        },
        {
          type: "bar",
          label: "JS JSON Deserialize",
          data: jsJsonDeserialize,
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
        },
        {
          type: "bar",
          label: "PY JSON Serialize",
          data: pyJsonSerialize,
          backgroundColor: "rgba(75, 192, 192, 0.8)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
        },
        {
          type: "bar",
          label: "PY JSON Deserialize",
          data: pyJsonDeserialize,
          backgroundColor: "rgba(75, 192, 192, 0.4)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
        },
        {
          type: "line",
          label: "JS JSON Total (Ser + Des)",
          data: jsJsonSerialize.map((s, i) => s + jsJsonDeserialize[i]),
          borderColor: "rgb(0, 0, 139)",
          backgroundColor: "rgba(0, 0, 139, 0.1)",
          borderWidth: 3,
          pointRadius: 5,
          fill: false,
        },
        {
          type: "line",
          label: "PY JSON Total (Ser + Des)",
          data: pyJsonSerialize.map((s, i) => s + pyJsonDeserialize[i]),
          borderColor: "rgb(0, 100, 0)",
          backgroundColor: "rgba(0, 100, 0, 0.1)",
          borderWidth: 3,
          pointRadius: 5,
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "JSON Serialization/Deserialization: JS vs Python",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            "\n\nRedis operations are excluded to isolate serialization cost.",
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 12 } },
        },
      },
      scales: {
        y: {
          suggestedMax: maxY,
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
  fs.writeFileSync(
    path.join(chartsDir, "persistence_json_no_redis.png"),
    buffer,
  );
  console.log("   ✓ Saved: persistence_json_no_redis.png");
}

// ============================================================================
// Story 3d: TOON/Pickle Serialization/Deserialization
// ============================================================================

console.log("📈 Chart 5d: TOON/Pickle Serialization/Deserialization...");

if (story3Data && story3bData) {
  const inputSizes = story3Data.map((r) => r.input.toUpperCase());

  const jsJsonSerialize = story3Data.map((r) => r.json_serialize_ms);
  const jsJsonDeserialize = story3Data.map((r) => r.json_deserialize_ms);
  const pyJsonSerialize = story3bData.map((r) => r.json_serialize_ms);
  const pyJsonDeserialize = story3bData.map((r) => r.json_deserialize_ms);

  const jsToonSerialize = story3Data.map((r) => r.toon_serialize_ms);
  const jsToonDeserialize = story3Data.map((r) => r.toon_deserialize_ms);
  const pyPickleSerialize = story3bData.map((r) => r.pickle_serialize_ms);
  const pyPickleDeserialize = story3bData.map((r) => r.pickle_deserialize_ms);

  const allData = [
    ...jsToonSerialize,
    ...jsToonDeserialize,
    ...pyPickleSerialize,
    ...pyPickleDeserialize,
    ...jsJsonSerialize,
    ...jsJsonDeserialize,
    ...pyJsonSerialize,
    ...pyJsonDeserialize,
  ];
  const maxY = Math.max(...allData) * 1.1;

  const config = {
    data: {
      labels: inputSizes,
      datasets: [
        {
          type: "bar",
          label: "JS TOON Serialize",
          data: jsToonSerialize,
          backgroundColor: "rgba(255, 206, 86, 0.8)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 1,
        },
        {
          type: "bar",
          label: "JS TOON Deserialize",
          data: jsToonDeserialize,
          backgroundColor: "rgba(255, 206, 86, 0.4)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 1,
        },
        {
          type: "bar",
          label: "PY Pickle Serialize",
          data: pyPickleSerialize,
          backgroundColor: "rgba(255, 159, 64, 0.8)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
        },
        {
          type: "bar",
          label: "PY Pickle Deserialize",
          data: pyPickleDeserialize,
          backgroundColor: "rgba(255, 159, 64, 0.4)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
        },
        {
          type: "line",
          label: "JS TOON Total (Ser + Des)",
          data: jsToonSerialize.map((s, i) => s + jsToonDeserialize[i]),
          borderColor: "rgb(139, 69, 19)",
          backgroundColor: "rgba(139, 69, 19, 0.1)",
          borderWidth: 3,
          pointRadius: 5,
          fill: false,
        },
        {
          type: "line",
          label: "PY Pickle Total (Ser + Des)",
          data: pyPickleSerialize.map((s, i) => s + pyPickleDeserialize[i]),
          borderColor: "rgb(75, 0, 130)",
          backgroundColor: "rgba(75, 0, 130, 0.1)",
          borderWidth: 3,
          pointRadius: 5,
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "TOON/Pickle Serialization/Deserialization: JS vs Python",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            "\n\nRedis operations are excluded to isolate serialization cost.",
          font: { size: 14 },
          padding: { bottom: 20 },
        },
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 12 } },
        },
      },
      scales: {
        y: {
          suggestedMax: maxY,
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
  fs.writeFileSync(
    path.join(chartsDir, "persistence_toon_pickle_no_redis.png"),
    buffer,
  );
  console.log("   ✓ Saved: persistence_toon_pickle_no_redis.png");
}

// ============================================================================
// Story 4: Logging Performance
// ============================================================================

if (story4Data) {
  console.log("📈 Chart 6: Logging Performance...");

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
  console.log("   ✓ Saved: logging_perf.png");
}

// ============================================================================
// Story 5: Memory Growth Over Iterations
// ============================================================================

const memoryData = loadPlatformJSON("profiling-memory");
if (memoryData) {
  console.log("📈 Chart 7: Memory Growth Over Iterations...");

  const inputSizes = memoryData.map((r) => r.input.toUpperCase());
  const heapGrowth = memoryData.map((r) =>
    parseFloat(r.heap_growth_per_iter_kb),
  );

  const config = {
    type: "bar",
    data: {
      labels: inputSizes,
      datasets: [
        {
          label: "Heap Growth per Iteration (KB)",
          data: heapGrowth,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Memory Growth per Iteration (50 iterations)",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • Flat line indicates no memory leaks",
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
            text: "Growth (KB/iteration)",
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
  fs.writeFileSync(path.join(chartsDir, "memory_growth.png"), buffer);
  console.log("   ✓ Saved: memory_growth.png");
}

// ============================================================================
// Story 5: Latency Distribution (p50/p95/p99)
// ============================================================================

if (memoryData) {
  console.log("📈 Chart 8: Latency Distribution...");

  const inputSizes = memoryData.map((r) => r.input.toUpperCase());
  const p50 = memoryData.map((r) => parseFloat(r.latency_p50_ms));
  const p95 = memoryData.map((r) => parseFloat(r.latency_p95_ms));
  const p99 = memoryData.map((r) => parseFloat(r.latency_p99_ms));

  const config = {
    type: "bar",
    data: {
      labels: inputSizes,
      datasets: [
        {
          label: "p50 (Median)",
          data: p50,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 2,
        },
        {
          label: "p95",
          data: p95,
          backgroundColor: "rgba(255, 206, 86, 0.6)",
          borderColor: "rgb(255, 206, 86)",
          borderWidth: 2,
        },
        {
          label: "p99",
          data: p99,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Latency Distribution: p50/p95/p99",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • FIR Filter → RMS Pipeline (50 iterations)",
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
            text: "Latency (ms)",
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
  fs.writeFileSync(path.join(chartsDir, "latency_distribution.png"), buffer);
  console.log("   ✓ Saved: latency_distribution.png");
}

// ============================================================================
// Story 5: Concurrent Scaling
// ============================================================================

const concurrencyData = loadPlatformJSON("profiling-concurrency");
const concurrencyThreadedData = loadPlatformJSON(
  "profiling-concurrency-threaded",
);
if (concurrencyData || concurrencyThreadedData) {
  console.log("📈 Chart 9: Concurrent Scaling...");

  const datasets = [];

  if (concurrencyData) {
    const pipelineCounts = concurrencyData.map((r) => r.num_pipelines);
    const throughput = concurrencyData.map(
      (r) => parseInt(r.throughput_samples_per_sec) / 1e6,
    );

    datasets.push({
      label: "Throughput (Million samples/sec) - Single Thread",
      data: throughput,
      borderColor: "rgb(153, 102, 255)",
      backgroundColor: "rgba(153, 102, 255, 0.2)",
      borderWidth: 3,
      tension: 0.1,
      fill: true,
    });
  }

  if (concurrencyThreadedData) {
    const pipelineCounts = concurrencyThreadedData.map((r) => r.num_pipelines);
    const throughput = concurrencyThreadedData.map(
      (r) => parseInt(r.throughput_samples_per_sec) / 1e6,
    );

    datasets.push({
      label: "Throughput (Million samples/sec) - Worker Threads",
      data: throughput,
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderWidth: 3,
      tension: 0.1,
      fill: true,
    });
  }

  const labels = concurrencyData
    ? concurrencyData.map((r) => r.num_pipelines)
    : concurrencyThreadedData.map((r) => r.num_pipelines);

  const config = {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Concurrent Pipeline Scaling",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • Should scale linearly or stay flat",
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
            text: "Throughput (M samples/sec)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Number of Concurrent Pipelines",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "concurrent_scaling.png"), buffer);
  console.log("   ✓ Saved: concurrent_scaling.png");
}

// ============================================================================
// Story 6: Audio Latency
// ============================================================================

console.log("📈 Chart 10: Audio Latency vs Buffer Duration...");

const audioLatencyData = loadPlatformJSON("audio-latency");
if (audioLatencyData) {
  // Map config to buffer duration
  const configToDuration = {
    "ultra-low": 2.67,
    low: 5.33,
    balanced: 10.67,
    "high-quality": 21.33,
    batch: 42.67,
  };

  // Group by pipeline type and config
  const pipelineTypes = [...new Set(audioLatencyData.map((r) => r.pipeline))];
  const configs = [...new Set(audioLatencyData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyData.filter(
      (r) => r.pipeline === pipeline,
    );
    const bufferDurations = pipelineData.map((r) => configToDuration[r.config]);
    const avgLatencies = pipelineData.map((r) => parseFloat(r.avg_ms));

    datasets.push({
      label: `${pipeline} pipeline`,
      data: avgLatencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency vs Buffer Duration",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • Processing time must be < buffer duration for real-time",
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
            text: "Latency (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(
    path.join(chartsDir, "audio_latency_vs_duration.png"),
    buffer,
  );
  console.log("   ✓ Saved: audio_latency_vs_duration.png");
}

console.log("📈 Chart 11: Audio Latency Percentiles...");

if (audioLatencyData) {
  const pipelineTypes = [...new Set(audioLatencyData.map((r) => r.pipeline))];
  const configs = [...new Set(audioLatencyData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyData.filter(
      (r) => r.pipeline === pipeline,
    );
    const p50Latencies = pipelineData.map((r) => parseFloat(r.p50_ms));
    const p95Latencies = pipelineData.map((r) => parseFloat(r.p95_ms));
    const p99Latencies = pipelineData.map((r) => parseFloat(r.p99_ms));

    datasets.push({
      label: `${pipeline} p50`,
      data: p50Latencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.1,
      fill: false,
    });

    datasets.push({
      label: `${pipeline} p95`,
      data: p95Latencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
      fill: false,
    });

    datasets.push({
      label: `${pipeline} p99`,
      data: p99Latencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.8)"),
      borderWidth: 4,
      tension: 0.1,
      fill: false,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency Percentiles",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • p99 must be < buffer duration for real-time",
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
            text: "Latency (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(
    path.join(chartsDir, "audio_latency_percentiles.png"),
    buffer,
  );
  console.log("   ✓ Saved: audio_latency_percentiles.png");
}

console.log("📈 Chart 12: Audio Latency Jitter...");

if (audioLatencyData) {
  const pipelineTypes = [...new Set(audioLatencyData.map((r) => r.pipeline))];
  const configs = [...new Set(audioLatencyData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyData.filter(
      (r) => r.pipeline === pipeline,
    );
    const avgJitters = pipelineData.map((r) => parseFloat(r.jitter_avg_ms));

    datasets.push({
      label: `${pipeline} pipeline`,
      data: avgJitters,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
      fill: true,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency Jitter",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • Lower jitter = more consistent real-time performance",
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
            text: "Average Jitter (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "audio_latency_jitter.png"), buffer);
  console.log("   ✓ Saved: audio_latency_jitter.png");
}

console.log("📈 Chart 13: Audio Latency Headroom...");

if (audioLatencyData) {
  const pipelineTypes = [...new Set(audioLatencyData.map((r) => r.pipeline))];
  const configs = [...new Set(audioLatencyData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyData.filter(
      (r) => r.pipeline === pipeline,
    );
    const headrooms = pipelineData.map((r) => parseFloat(r.headroom_percent));

    datasets.push({
      label: `${pipeline} pipeline`,
      data: headrooms,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
      fill: true,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency Headroom",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • Higher headroom = more reliable real-time performance",
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
            text: "Headroom (%)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "audio_latency_headroom.png"), buffer);
  console.log("   ✓ Saved: audio_latency_headroom.png");
}

// ============================================================================
// Story 6: DSP Processing Time
// ============================================================================

console.log("📈 Chart 14: DSP Processing Time vs Buffer Duration...");

if (audioLatencyData) {
  // Map config to buffer duration
  const configToDuration = {
    "ultra-low": 2.67,
    low: 5.33,
    balanced: 10.67,
    "high-quality": 21.33,
    batch: 42.67,
  };

  // Group by pipeline type and config
  const pipelineTypes = [...new Set(audioLatencyData.map((r) => r.pipeline))];
  const configs = [...new Set(audioLatencyData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyData.filter(
      (r) => r.pipeline === pipeline,
    );
    const bufferDurations = pipelineData.map((r) => configToDuration[r.config]);
    const procAvgLatencies = pipelineData.map((r) => parseFloat(r.proc_avg_ms));

    datasets.push({
      label: `${pipeline} pipeline`,
      data: procAvgLatencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "DSP Processing Time vs Buffer Duration",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • Pure DSP computation time (excludes OS timing overhead)",
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
            text: "Processing Time (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "dsp_processing_time.png"), buffer);
  console.log("   ✓ Saved: dsp_processing_time.png");
}

console.log("📈 Chart 15: DSP Processing Dropouts...");

if (audioLatencyData) {
  const pipelineTypes = [...new Set(audioLatencyData.map((r) => r.pipeline))];
  const configs = [...new Set(audioLatencyData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyData.filter(
      (r) => r.pipeline === pipeline,
    );
    const procDropouts = pipelineData.map((r) => parseFloat(r.proc_dropouts));

    datasets.push({
      label: `${pipeline} pipeline`,
      data: procDropouts,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
      fill: true,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "DSP Processing Dropouts",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • Processing time exceeded buffer duration (pure DSP failures)",
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
            text: "Dropouts (count)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(chartsDir, "dsp_processing_dropouts.png"), buffer);
  console.log("   ✓ Saved: dsp_processing_dropouts.png");
}

// ============================================================================
// Story 6: Audio Latency (Threaded Version)
// ============================================================================

console.log("📈 Chart 16: Audio Latency Threaded vs Buffer Duration...");

if (audioLatencyThreadedData) {
  // Map config to buffer duration
  const configToDuration = {
    "ultra-low": 2.67,
    low: 5.33,
    balanced: 10.67,
    "high-quality": 21.33,
    batch: 42.67,
  };

  // Group by pipeline type and config
  const pipelineTypes = [
    ...new Set(audioLatencyThreadedData.map((r) => r.pipeline)),
  ];
  const configs = [...new Set(audioLatencyThreadedData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyThreadedData.filter(
      (r) => r.pipeline === pipeline,
    );
    const bufferDurations = pipelineData.map((r) => configToDuration[r.config]);
    const avgLatencies = pipelineData.map((r) => parseFloat(r.avg_ms));

    datasets.push({
      label: `${pipeline} pipeline (threaded)`,
      data: avgLatencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency Threaded vs Buffer Duration",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle + " • Worker thread isolates DSP from main thread noise",
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
            text: "Latency (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(
    path.join(chartsDir, "audio_latency_threaded_vs_duration.png"),
    buffer,
  );
  console.log("   ✓ Saved: audio_latency_threaded_vs_duration.png");
}

console.log("📈 Chart 17: DSP Processing Time Threaded...");

if (audioLatencyThreadedData) {
  // Map config to buffer duration
  const configToDuration = {
    "ultra-low": 2.67,
    low: 5.33,
    balanced: 10.67,
    "high-quality": 21.33,
    batch: 42.67,
  };

  // Group by pipeline type and config
  const pipelineTypes = [
    ...new Set(audioLatencyThreadedData.map((r) => r.pipeline)),
  ];
  const configs = [...new Set(audioLatencyThreadedData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyThreadedData.filter(
      (r) => r.pipeline === pipeline,
    );
    const bufferDurations = pipelineData.map((r) => configToDuration[r.config]);
    const procAvgLatencies = pipelineData.map((r) => parseFloat(r.proc_avg_ms));

    datasets.push({
      label: `${pipeline} pipeline (threaded)`,
      data: procAvgLatencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 3,
      tension: 0.1,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "DSP Processing Time Threaded",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: subtitle + " • Pure DSP computation in isolated worker thread",
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
            text: "Processing Time (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(
    path.join(chartsDir, "dsp_processing_time_threaded.png"),
    buffer,
  );
  console.log("   ✓ Saved: dsp_processing_time_threaded.png");
}

console.log("📈 Chart 18: Audio Latency Percentiles Threaded...");

if (audioLatencyThreadedData) {
  const pipelineTypes = [
    ...new Set(audioLatencyThreadedData.map((r) => r.pipeline)),
  ];
  const configs = [...new Set(audioLatencyThreadedData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyThreadedData.filter(
      (r) => r.pipeline === pipeline,
    );
    const p50Latencies = pipelineData.map((r) => parseFloat(r.p50_ms));
    const p95Latencies = pipelineData.map((r) => parseFloat(r.p95_ms));
    const p99Latencies = pipelineData.map((r) => parseFloat(r.p99_ms));

    datasets.push({
      label: `${pipeline} p50`,
      data: p50Latencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.1,
      fill: false,
    });

    datasets.push({
      label: `${pipeline} p95`,
      data: p95Latencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 2,
      borderDash: [10, 5],
      tension: 0.1,
      fill: false,
    });

    datasets.push({
      label: `${pipeline} p99`,
      data: p99Latencies,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 2,
      tension: 0.1,
      fill: false,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency Percentiles Threaded",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • p50/p95/p99 latency percentiles across 1000 iterations",
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
            text: "Latency (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(
    path.join(chartsDir, "audio_latency_percentiles_threaded.png"),
    buffer,
  );
  console.log("   ✓ Saved: audio_latency_percentiles_threaded.png");
}

console.log("📈 Chart 19: Audio Latency Jitter Threaded...");

if (audioLatencyThreadedData) {
  const pipelineTypes = [
    ...new Set(audioLatencyThreadedData.map((r) => r.pipeline)),
  ];
  const configs = [...new Set(audioLatencyThreadedData.map((r) => r.config))];

  const datasets = [];
  const colors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
  ];

  pipelineTypes.forEach((pipeline, idx) => {
    const pipelineData = audioLatencyThreadedData.filter(
      (r) => r.pipeline === pipeline,
    );
    const avgJitters = pipelineData.map((r) => parseFloat(r.jitter_avg_ms));
    const maxJitters = pipelineData.map((r) => parseFloat(r.jitter_max_ms));

    datasets.push({
      label: `${pipeline} avg jitter`,
      data: avgJitters,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 2,
      tension: 0.1,
      fill: false,
    });

    datasets.push({
      label: `${pipeline} max jitter`,
      data: maxJitters,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.2)"),
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.1,
      fill: false,
    });
  });

  const config = {
    type: "line",
    data: {
      labels: configs.map((c) => c.replace("-", " ")),
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Audio Latency Jitter Threaded",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text:
            subtitle +
            " • Jitter measures latency variation between consecutive samples",
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
            text: "Jitter (ms)",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
          beginAtZero: true,
        },
        x: {
          title: {
            display: true,
            text: "Buffer Configuration",
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
      },
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(
    path.join(chartsDir, "audio_latency_jitter_threaded.png"),
    buffer,
  );
  console.log("   ✓ Saved: audio_latency_jitter_threaded.png");
}

console.log("\n✅ All charts regenerated successfully!\n");
console.log(`📁 Charts saved to: ${chartsDir}`);
