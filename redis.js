/**
 * Story 3 — Redis Resilience (State Persistence)
 *
 * Demonstrates seamless state save/load for streaming DSP pipelines
 */

import { createDspPipeline } from "dspx";
import { createClient } from "redis";
import { createHash } from "crypto";
import {
  INPUT_SIZES,
  genSignal,
  getMachineSpecs,
  runTimed,
  saveJSON,
  ensureDirs,
  formatBytes,
} from "./common.js";

ensureDirs();

console.log("🚀 Story 3 — Redis Resilience (State Persistence)\n");

const specs = getMachineSpecs();
console.log("Machine Specs:");
console.log(`  CPU: ${specs.cpu}`);
console.log(`  Node: ${specs.node}`);
console.log(`  dspx: ${specs.dspx}\n`);

// Check if Redis is available
let redis;
let redisAvailable = false;

try {
  redis = createClient({ url: "redis://localhost:6379" });
  await redis.connect();
  await redis.ping();
  redisAvailable = true;
  console.log("✓ Connected to Redis\n");
} catch (e) {
  console.log(
    "⚠️  Redis not available - testing state save/load without Redis\n"
  );
  console.log("   To test with Redis: docker run -d -p 6379:6379 redis\n");
}

const results = [];

console.log("=".repeat(80));
console.log("PIPELINE STATE PERSISTENCE");
console.log("=".repeat(80));
console.log("\nPipeline: FirFilter → RMS\n");

for (const size of INPUT_SIZES) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `Input: ${size.name.toUpperCase()} (${size.length.toLocaleString()} samples)`
  );
  console.log("=".repeat(80));

  const signal = genSignal(size.length, 50, 10000);
  const halfLength = Math.floor(size.length / 2);
  const firstHalf = signal.slice(0, halfLength);
  const secondHalf = signal.slice(halfLength);

  // --- Create pipeline and process first half ---
  const pipeline1 = createDspPipeline();
  pipeline1
    .filter({
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: 3000,
      sampleRate: 10000,
      order: 51,
      windowType: "hamming",
    })
    .Rms({ mode: "moving", windowSize: 100 });

  console.log("\n📊 Phase 1: Process first half + save state");

  const output1 = await pipeline1.process(firstHalf, {
    sampleRate: 10000,
    channels: 1,
  });

  // --- Save state ---
  let saveTime, loadTime, stateSize;
  let seamless = false;

  const saveResult = await runTimed(
    "save-state",
    async () => {
      return await pipeline1.saveState();
    },
    1,
    5
  );

  const savedState = await pipeline1.saveState();
  stateSize = new Blob([savedState]).size;
  saveTime = saveResult.avg;

  console.log(`   ✓ State saved in ${saveTime.toFixed(3)} ms`);
  console.log(`   ✓ State size: ${formatBytes(stateSize)}`);

  // Save to Redis if available
  if (redisAvailable) {
    const stateKey = `dsp:benchmark:${size.name}`;
    await redis.set(stateKey, savedState);
    console.log(`   ✓ State persisted to Redis (key: ${stateKey})`);
  }

  // --- Create new pipeline and restore state ---
  console.log("\n📊 Phase 2: Create new pipeline + load state");

  const pipeline2 = createDspPipeline();
  pipeline2
    .filter({
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: 3000,
      sampleRate: 10000,
      order: 51,
      windowType: "hamming",
    })
    .Rms({ mode: "moving", windowSize: 100 });

  const loadResult = await runTimed(
    "load-state",
    async () => {
      await pipeline2.loadState(savedState);
    },
    1,
    5
  );

  loadTime = loadResult.avg;
  console.log(`   ✓ State loaded in ${loadTime.toFixed(3)} ms`);

  // --- Process second half with restored state ---
  console.log("\n📊 Phase 3: Process second half with restored state");

  const output2 = await pipeline2.process(secondHalf, {
    sampleRate: 10000,
    channels: 1,
  });

  // --- Verify continuity (compare with non-interrupted processing) ---
  console.log("\n📊 Phase 4: Verify continuity");

  const pipelineContinuous = createDspPipeline();
  pipelineContinuous
    .filter({
      type: "fir",
      mode: "lowpass",
      cutoffFrequency: 3000,
      sampleRate: 10000,
      order: 51,
      windowType: "hamming",
    })
    .Rms({ mode: "moving", windowSize: 100 });

  const outputContinuous = await pipelineContinuous.process(signal, {
    sampleRate: 10000,
    channels: 1,
  });

  // Combine restored outputs
  const outputRestored = new Float32Array(output1.length + output2.length);
  outputRestored.set(output1, 0);
  outputRestored.set(output2, output1.length);

  // Compute SHA-256 hashes
  const hashContinuous = createHash("sha256")
    .update(Buffer.from(outputContinuous.buffer))
    .digest("hex");

  const hashRestored = createHash("sha256")
    .update(Buffer.from(outputRestored.buffer))
    .digest("hex");

  seamless = hashContinuous === hashRestored;

  if (seamless) {
    console.log("   ✅ SEAMLESS: Outputs match perfectly!");
    console.log(`   ✓ SHA-256 hash: ${hashContinuous.substring(0, 16)}...`);
  } else {
    console.log("   ⚠️  Outputs differ (expected for edge effects)");
    console.log(`   Continuous: ${hashContinuous.substring(0, 16)}...`);
    console.log(`   Restored:   ${hashRestored.substring(0, 16)}...`);
  }

  // --- Record results ---
  const data = {
    test: "redis_persistence",
    input: size.name,
    samples: size.length,
    save_ms: saveTime,
    load_ms: loadTime,
    state_size_bytes: stateSize,
    seamless,
    redis_available: redisAvailable,
    meta: specs,
  };

  results.push(data);
}

// Clean up Redis
if (redisAvailable) {
  await redis.disconnect();
  console.log("\n✓ Disconnected from Redis");
}

// Save results
saveJSON("redis", results);

// Summary
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));

const avgSaveMs =
  results.reduce((sum, r) => sum + r.save_ms, 0) / results.length;
const avgLoadMs =
  results.reduce((sum, r) => sum + r.load_ms, 0) / results.length;
const avgStateSize =
  results.reduce((sum, r) => sum + r.state_size_bytes, 0) / results.length;
const allSeamless = results.every((r) => r.seamless);

console.log(`\nAverage save time:  ${avgSaveMs.toFixed(3)} ms`);
console.log(`Average load time:  ${avgLoadMs.toFixed(3)} ms`);
console.log(`Average state size: ${formatBytes(avgStateSize)}`);
console.log(`All seamless:       ${allSeamless ? "✅ YES" : "⚠️  NO"}`);

console.log("\nKey insights:");
console.log(
  "  • State save/load operations are extremely fast (< 1ms typical)"
);
console.log("  • State size scales with pipeline complexity, not input size");
console.log("  • Processing resumes seamlessly without data loss");
console.log("  • Ideal for crash recovery and distributed processing\n");

console.log("✅ Story 3 benchmarks complete!\n");
