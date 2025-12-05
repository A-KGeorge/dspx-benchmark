// Test TOON cross-pipeline support
import { createDspPipeline } from "dspx";
import { createClient } from "redis";

const client = await createClient()
  .on("error", (err) => console.error("Redis error:", err))
  .connect();
console.log("✓ Connected to Redis\n");

// Generate test signal
const sampleRate = 2000;
const signal = new Float32Array(1000);
for (let i = 0; i < signal.length; i++) {
  signal[i] = Math.sin((2 * Math.PI * 10 * i) / sampleRate);
}

const firstHalf = signal.slice(0, 500);
const secondHalf = signal.slice(500);

console.log(
  "================================================================================"
);
console.log(
  "TEST: Save from Pipeline A (2 stages), Load into Pipeline B (3 stages)"
);
console.log(
  "================================================================================\n"
);

// Pipeline A: [RMS → ZScoreNormalize]
console.log("Creating Pipeline A with 2 stages: [RMS → ZScoreNormalize]");
const pipelineA = createDspPipeline();
pipelineA.Rms({ mode: "moving", windowSize: 50 });
pipelineA.ZScoreNormalize({ mode: "moving", windowSize: 100 });

await pipelineA.process(firstHalf, { sampleRate, channels: 1 });
const state = await pipelineA.saveState({ format: "toon" });
// Store as base64 string to preserve binary data
const stateStr = Buffer.from(state).toString("base64");
await client.set("test:cross-pipeline", stateStr);
console.log(`✓ Saved state to Redis: ${(state.length / 1024).toFixed(2)} KB\n`);

// Pipeline B: [RMS → ZScoreNormalize → Rectify]
console.log(
  "Creating Pipeline B with 3 stages: [RMS → ZScoreNormalize → Rectify]"
);
const pipelineB = createDspPipeline();
pipelineB.Rms({ mode: "moving", windowSize: 50 });
pipelineB.ZScoreNormalize({ mode: "moving", windowSize: 100 });
pipelineB.Rectify({ mode: "fullWave" });

const loadedStateStr = await client.get("test:cross-pipeline");
const loadedState = new Uint8Array(Buffer.from(loadedStateStr, "base64"));
try {
  await pipelineB.loadState(loadedState);
  console.log("✓ Loaded state into Pipeline B");
  console.log("  First 2 stages (RMS, ZScore) restored from saved state");
  console.log("  Rectify stage remains uninitialized\n");

  const output = await pipelineB.process(secondHalf, {
    sampleRate,
    channels: 1,
  });
  console.log(
    `✅ SUCCESS: Processed ${output.length} samples with cross-pipeline state\n`
  );
} catch (error) {
  console.log(`❌ FAILED: ${error.message}\n`);
}

await client.disconnect();
console.log("✓ Disconnected from Redis");
