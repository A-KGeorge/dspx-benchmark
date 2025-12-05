import {
  createDspPipeline,
  createTopicRouter,
  createMockHandler,
  DspUtils,
} from "dspx";

// logging logic

const mockPagerDuty = createMockHandler((log) => {
  console.log(`   [PagerDuty] Alert triggered: ${log.message}`);
});

const mockPrometheus = createMockHandler((log) => {
  console.log(`   [Prometheus] Metric recorded: ${log.topic}`);
});

const mockLoki = createMockHandler((log) => {
  console.log(`   [Loki] Log stored: [${log.level}] ${log.message}`);
});

const router = createTopicRouter()
  .errors(mockPagerDuty.handler, { trackMetrics: true })
  .performance(mockPrometheus.handler, { trackMetrics: true })
  .debug(mockLoki.handler, { trackMetrics: true })
  .build();

// convolution processing logic

// Grid dimensions
const rows = 3;
const cols = 3;
const timeSamples = 5;
const totalChannels = rows * cols; // 9 channels

console.log(`Grid: ${rows}x${cols} (${totalChannels} sensors)`);
console.log(`Time samples per sensor: ${timeSamples}`);
console.log(`Total data points: ${totalChannels * timeSamples}\n`);

// Create planar input: Array of Float32Arrays (one per channel)
const planarInput = [];
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    // Each sensor has the same pattern for easy verification
    planarInput.push(new Float32Array([2, 4, 6, 8, 10]));
  }
}

console.log("Input as Planar Arrays (one per sensor):");
for (let i = 0; i < totalChannels; i++) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  console.log(
    `Sensor [${r}][${c}]: [${Array.from(planarInput[i]).join(", ")}]`
  );
}
console.log("");

const kernel = new Float32Array([0.5, 0.5]);
console.log("1D Time Kernel:", Array.from(kernel));
console.log("");

// ============================================================================
// BATCH MODE: No state retention
// ============================================================================
console.log("--- BATCH MODE ---");

const pipeline = createDspPipeline()
  .pipeline({ onLogBatch: (logs) => router.routeBatch(logs) })
  .convolution({ kernel, mode: "batch" })
  .tap((data, stageName) => {
    console.log(
      `   [Tap] After stage "${stageName}", data length: ${data.length}`
    );
  });

// Process with planar input - pipeline handles interleaving automatically
const batchResult = await pipeline.processCopy(planarInput, {
  channels: totalChannels, // Explicitly specify number of channels
});

const expectedOutputPerChannel = [3, 5, 7, 9];
const expectedOutputLength = 4 * totalChannels; // 36

console.log(
  `Output length: ${batchResult.length} (expected: ${expectedOutputLength})`
);
console.log(
  `Output samples per channel: ${batchResult.length / totalChannels}`
);
console.log("");

// Deinterleave output using DspUtils
const planarOutput = DspUtils.deinterleave(batchResult, totalChannels);

console.log("Output as Planar Arrays (convolved):");
let allCorrect = true;

for (let i = 0; i < totalChannels; i++) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const channelOutput = Array.from(planarOutput[i]);

  console.log(
    `Sensor [${r}][${c}]: [${channelOutput
      .map((v) => v.toFixed(1))
      .join(", ")}]`
  );

  // Verify correctness
  for (let t = 0; t < channelOutput.length; t++) {
    if (Math.abs(channelOutput[t] - expectedOutputPerChannel[t]) > 0.001) {
      allCorrect = false;
    }
  }
}
console.log("");

// Alternative: Get specific channel using getChannel
console.log("Example: Getting just Sensor [0][0] using getChannel:");
const sensor00 = DspUtils.getChannel(batchResult, totalChannels, 0);
console.log(
  `Sensor [0][0]: [${Array.from(sensor00)
    .map((v) => v.toFixed(1))
    .join(", ")}]`
);
console.log("");

console.log("Expected per channel:", expectedOutputPerChannel);
console.log("");

console.log("Mathematical verification for one channel:");
console.log("  Input: [2, 4, 6, 8, 10]");
console.log("  Kernel: [0.5, 0.5]");
console.log("  Output[0] = 0.5*2 + 0.5*4 = 1 + 2 = 3 ✓");
console.log("  Output[1] = 0.5*4 + 0.5*6 = 2 + 3 = 5 ✓");
console.log("  Output[2] = 0.5*6 + 0.5*8 = 3 + 4 = 7 ✓");
console.log("  Output[3] = 0.5*8 + 0.5*10 = 4 + 5 = 9 ✓");
console.log("");

console.log(
  allCorrect ? "✅ ALL CHANNELS CORRECT" : "❌ SOME CHANNELS INCORRECT"
);
console.log("");

// ============================================================================
// MOVING MODE: Stateful processing
// ============================================================================
console.log("--- MOVING MODE ---");

const movingPipeline = createDspPipeline()
  .pipeline({
    onLogBatch: (logs) => router.routeBatch(logs),
  })
  .convolution({
    kernel: kernel,
    mode: "moving",
  })
  .tap((data, stageName) => {
    console.log(
      `   [Tap] After stage "${stageName}", data length: ${data.length}`
    );
  });

// Use planar input directly - pipeline handles interleaving
const movingResult = await movingPipeline.process(planarInput, {
  channels: totalChannels, // Explicitly specify number of channels
});

console.log(
  `Output length: ${movingResult.length} (same as input interleaved: ${
    totalChannels * timeSamples
  })`
);
console.log("");

// Deinterleave the moving result for easier inspection
const movingPlanarOutput = DspUtils.deinterleave(movingResult, totalChannels);

console.log("First time sample output (all channels):");
const firstSampleOutput = movingPlanarOutput.map((ch) => ch[0].toFixed(1));
console.log(firstSampleOutput.join(", "));
console.log("(First sample is 0 for all channels - buffer not full yet)");
console.log("");

console.log("Second time sample output (all channels):");
const secondSampleOutput = movingPlanarOutput.map((ch) => ch[1].toFixed(1));
console.log(secondSampleOutput.join(", "));
console.log("(All channels should be 3.0 = 0.5*2 + 0.5*4)");
console.log("");

// Verify moving mode correctness
const movingCorrect =
  movingResult.length === totalChannels * timeSamples &&
  Math.abs(movingPlanarOutput[0][0]) < 0.001 && // First sample is 0 (buffer filling)
  Math.abs(movingPlanarOutput[0][1] - 3.0) < 0.001; // Second sample is 3.0

console.log(
  movingCorrect ? "✅ MOVING MODE CORRECT" : "❌ MOVING MODE INCORRECT"
);
console.log("");

// // ============================================================================
// // SUMMARY
// // ============================================================================
// console.log("=".repeat(70));
// console.log("SUMMARY");
// console.log("=".repeat(70));
// console.log("");
// console.log("2D Convolution via Multi-Channel API:");
// console.log("  • Data: 3x3 grid (9 channels), 5 time samples each");
// console.log(
//   "  • Flattened: Interleaved format [ch0_t0, ch1_t0, ..., ch8_t0, ch0_t1, ...]"
// );
// console.log("  • Kernel: 1D time-domain [0.5, 0.5]");
// console.log("  • Each channel convolved independently");
// console.log("");
// console.log("Batch Mode:");
// console.log("  • Valid convolution: Output length = N - M + 1 = 5 - 2 + 1 = 4");
// console.log("  • All 9 channels produce [3, 5, 7, 9]");
// console.log("");
// console.log("Moving Mode:");
// console.log("  • Stateful: Output length = N = 5 (same as input)");
// console.log("  • First sample is 0 (buffer filling)");
// console.log("  • Subsequent samples are convolved values");
// console.log("");
