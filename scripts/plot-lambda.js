import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "node:fs";
import path from "node:path";

const width = 1000;
const height = 600;
const chartCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "white",
});

async function generateChart() {
  const data = JSON.parse(
    fs.readFileSync("./results/aws-lambda-1769mb.json", "utf8"),
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
  fs.writeFileSync("./charts/lambda_arch_comparison.png", buffer);
  console.log("✅ Chart saved to ./charts/lambda_arch_comparison.png");
}

generateChart().catch(console.error);
