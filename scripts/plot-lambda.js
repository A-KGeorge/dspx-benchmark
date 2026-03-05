import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const width = 1000;
const height = 600;
const chartCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "white",
});

const base_dir = path.dirname(fileURLToPath(import.meta.url));
const results_dir = path.join(base_dir, "../results/lambda");
const charts_dir = path.join(base_dir, "../charts/lambda");

function formatSamples(n) {
  if (!n && n !== 0) return "";
  if (n >= 1000000)
    return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1000)
    return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${n}`;
}

function loadPersistenceSamplesMap() {
  try {
    const p = JSON.parse(
      fs.readFileSync(
        path.join(results_dir, "aws-lambda-persistence.json"),
        "utf8",
      ),
    );
    const map = {};
    (p.arm64 || []).forEach((d) => {
      if (d.input && d.samples) map[d.input] = d.samples;
    });
    (p.x64 || []).forEach((d) => {
      if (d.input && d.samples) map[d.input] = d.samples;
    });
    return map;
  } catch (e) {
    return {};
  }
}

async function generateChart() {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(results_dir, "aws-lambda-comparison.json"),
      "utf8",
    ),
  );

  const labels = ["SMALL (1K)", "MEDIUM (4K)", "LARGE (1M)"];

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "AWS Graviton (arm64)",
          data: data.arm64.map((d) => d.throughput),
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
        },
        {
          label: "AWS Intel/AMD (x64)",
          data: data.x64.map((d) => d.throughput),
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "dspx Throughput on AWS Lambda (2048 MB / ~1.16 vCPU)",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: "Moving Average O(1) • Throughput (Million samples/sec) - Higher is Better",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "M samples/sec" },
        },
        x: {
          title: { display: true, text: "Input Buffer Size" },
        },
      },
    },
  };

  console.log("📊 Generating comparison chart...");
  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(charts_dir, "lambda_comparison.png"), buffer);
  console.log("✅ Chart saved to ./charts/lambda/lambda_comparison.png");
}

generateChart().catch(console.error);

async function generateChart1769() {
  const data = JSON.parse(
    fs.readFileSync(path.join(results_dir, "aws-lambda-1769mb.json"), "utf8"),
  );

  const labels = ["SMALL (1K)", "MEDIUM (4K)", "LARGE (1M)"];

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "AWS Graviton (arm64)",
          data: data.arm64.map((d) => d.throughput),
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
        },
        {
          label: "AWS Intel/AMD (x64)",
          data: data.x64.map((d) => d.throughput),
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "dspx Throughput on AWS Lambda (1769 MB / ~1 vCPU)",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: "Moving Average O(1) • Throughput (Million samples/sec) - Higher is Better",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "M samples/sec" },
        },
        x: {
          title: { display: true, text: "Input Buffer Size" },
        },
      },
    },
  };

  console.log("📊 Generating comparison chart...");
  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(charts_dir, "lambda_arch_comparison.png"), buffer);
  console.log("✅ Chart saved to ./charts/lambda/lambda_arch_comparison.png");
}

generateChart1769().catch(console.error);

async function generatePersistenceChart() {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(results_dir, "aws-lambda-persistence.json"),
      "utf8",
    ),
  );

  const labels = data.arm64.map(
    (d) => `${d.input} (${formatSamples(d.samples)})`,
  );

  const arm64_json = data.arm64.map((d) => d.json.throughput_mbs);
  const x64_json = data.x64.map((d) => d.json.throughput_mbs);
  const arm64_toon = data.arm64.map((d) => d.toon.throughput_mbs);
  const x64_toon = data.x64.map((d) => d.toon.throughput_mbs);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "arm64 - json",
          data: arm64_json,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
        },
        {
          label: "x64 - json",
          data: x64_json,
          backgroundColor: "rgba(255, 99, 132, 0.8)",
        },
        {
          label: "arm64 - toon",
          data: arm64_toon,
          backgroundColor: "rgba(75, 192, 192, 0.8)",
        },
        {
          label: "x64 - toon",
          data: x64_toon,
          backgroundColor: "rgba(255, 205, 86, 0.8)",
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "dspx Persistence Throughput (Million samples/sec)",
          font: { size: 18, weight: "bold" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "M samples/sec" },
        },
      },
    },
  };

  console.log("📊 Generating persistence chart...");
  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(charts_dir, "lambda_persistence.png"), buffer);
  console.log("✅ Chart saved to ./charts/lambda/lambda_persistence.png");
}

async function generateLatencyChart() {
  const data = JSON.parse(
    fs.readFileSync(path.join(results_dir, "latency_metrics.json"), "utf8"),
  );

  const sampleMap = loadPersistenceSamplesMap();
  const labels = data.x86_64.map((d) => {
    const s = d.samples || sampleMap[d.input];
    return s ? `${d.input} (${formatSamples(s)})` : d.input;
  });
  const stats = ["p50", "p95", "p99", "avg"];

  // Helper to build datasets for a single architecture (grouped bars per input)
  function buildDatasetsForArch(archData, colorBase) {
    return stats.map((stat, idx) => ({
      label: stat,
      data: archData.map((d) => d[stat]),
      backgroundColor: colorBase[idx],
    }));
  }

  const x86Colors = ["#1f77b4cc", "#ff7f0ecc", "#2ca02ccc", "#d62728cc"];
  const armColors = ["#9467bdcc", "#8c564bcc", "#e377c2cc", "#7f7f7fcc"];

  const x86Datasets = buildDatasetsForArch(data.x86_64, x86Colors);
  const armDatasets = buildDatasetsForArch(data.arm64, armColors);

  const configX86 = {
    type: "bar",
    data: { labels, datasets: x86Datasets },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Latency Profiling — x86_64 (ms)",
          font: { size: 18, weight: "bold" },
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "ms" } },
      },
    },
  };

  const configArm = {
    type: "bar",
    data: { labels, datasets: armDatasets },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Latency Profiling — arm64 (ms)",
          font: { size: 18, weight: "bold" },
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "ms" } },
      },
    },
  };

  console.log("📊 Generating latency charts (x86_64 and arm64)...");
  const bufX86 = await chartCanvas.renderToBuffer(configX86);
  fs.writeFileSync(path.join(charts_dir, "lambda_latency_x86.png"), bufX86);
  const bufArm = await chartCanvas.renderToBuffer(configArm);
  fs.writeFileSync(path.join(charts_dir, "lambda_latency_arm64.png"), bufArm);
  console.log(
    "✅ Charts saved to ./charts/lambda/lambda_latency_x86.png and lambda_latency_arm64.png",
  );
}

async function generateMemoryChart() {
  const data = JSON.parse(
    fs.readFileSync(path.join(results_dir, "memory_metrics.json"), "utf8"),
  );

  const labels = data.x86_64.map(
    (d) => `${d.input} (${formatSamples(d.samples)})`,
  );

  const x86_before = data.x86_64.map((d) => d.heap_before_mb);
  const x86_peak = data.x86_64.map((d) => d.heap_peak_mb);
  const arm_before = data.arm64.map((d) => d.heap_before_mb);
  const arm_peak = data.arm64.map((d) => d.heap_peak_mb);
  const x86_growth = data.x86_64.map((d) => d.growth_per_iter_kb);
  const arm_growth = data.arm64.map((d) => d.growth_per_iter_kb);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "x86_64 heap before (MB)",
          data: x86_before,
          backgroundColor: "rgba(54,162,235,0.8)",
        },
        {
          label: "x86_64 heap peak (MB)",
          data: x86_peak,
          backgroundColor: "rgba(54,162,235,0.5)",
        },
        {
          label: "arm64 heap before (MB)",
          data: arm_before,
          backgroundColor: "rgba(255,99,132,0.8)",
        },
        {
          label: "arm64 heap peak (MB)",
          data: arm_peak,
          backgroundColor: "rgba(255,99,132,0.5)",
        },
        {
          label: "x86_64 growth per iter (KB)",
          data: x86_growth,
          type: "line",
          yAxisID: "y1",
          borderColor: "#2ca02c",
          backgroundColor: "#2ca02c33",
          tension: 0.2,
        },
        {
          label: "arm64 growth per iter (KB)",
          data: arm_growth,
          type: "line",
          yAxisID: "y1",
          borderColor: "#9467bd",
          backgroundColor: "#9467bd33",
          tension: 0.2,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Memory Profiling — Heap (MB) and Growth (KB)",
          font: { size: 18, weight: "bold" },
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "MB" } },
        y1: {
          position: "right",
          beginAtZero: true,
          title: { display: true, text: "KB" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  };

  console.log("📊 Generating memory chart...");
  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(charts_dir, "lambda_memory.png"), buffer);
  console.log("✅ Chart saved to ./charts/lambda/lambda_memory.png");
}

async function generateP99ComparisonChart() {
  const data = JSON.parse(
    fs.readFileSync(path.join(results_dir, "latency_metrics.json"), "utf8"),
  );

  const sampleMap = loadPersistenceSamplesMap();
  const labels = data.x86_64.map((d) => {
    const s = d.samples || sampleMap[d.input];
    return s ? `${d.input} (${formatSamples(s)})` : d.input;
  });

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "x86_64 - p99",
          data: data.x86_64.map((d) => d.p99),
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
        },
        {
          label: "arm64 - p99",
          data: data.arm64.map((d) => d.p99),
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "dspx p99 Latency Comparison on AWS Lambda",
          font: { size: 20, weight: "bold" },
        },
        subtitle: {
          display: true,
          text: "p99 Latency (ms) - Lower is Better",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Latency (ms)" },
        },
        x: {
          title: { display: true, text: "Input Buffer Size" },
        },
      },
    },
  };

  console.log("📊 Generating p99 comparison chart...");
  const buffer = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync(path.join(charts_dir, "lambda_p99_comparison.png"), buffer);
  console.log("✅ Chart saved to ./charts/lambda/lambda_p99_comparison.png");
}

// Generate additional charts
generatePersistenceChart().catch(console.error);
generateLatencyChart().catch(console.error);
generateMemoryChart().catch(console.error);
generateP99ComparisonChart().catch(console.error);
