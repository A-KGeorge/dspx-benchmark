/**
 * Process Sync Test Script
 * Tests the pipeline.processSync method from DSPx
 */
import { createDspPipeline } from "dspx";

console.log("🧪 Testing pipeline.processSync functionality...");

// Test 1: Create pipeline
let pipeline;
try {
  pipeline = createDspPipeline();
  console.log("✅ Pipeline created successfully");
} catch (error) {
  console.error("❌ Pipeline creation failed:", error.message);
  process.exit(1);
}

// Test 2: Configure pipeline
try {
  pipeline.filter({
    type: "butterworth",
    mode: "lowpass",
    cutoffFrequency: 8000,
    sampleRate: 44100,
    order: 4,
  });
  console.log("✅ Pipeline configured successfully");
} catch (error) {
  console.error("❌ Pipeline configuration failed:", error.message);
  process.exit(1);
}

// Test 3: Test processSync with sample data
try {
  const sampleRate = 44100;
  const bufferSize = 1024;
  const inputBuffer = new Float32Array(bufferSize);

  // Fill with some test data (sine wave)
  for (let i = 0; i < bufferSize; i++) {
    inputBuffer[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate); // 440Hz sine wave
  }

  console.log("Testing processSync operation...");
  const output = pipeline.processSync(inputBuffer, {
    sampleRate,
    channels: 1,
  });

  console.log("✅ processSync completed successfully");
  console.log(
    `Input length: ${inputBuffer.length}, Output length: ${output.length}`
  );
  console.log(`Output type: ${output.constructor.name}`);

  // Basic validation
  if (output.length === bufferSize) {
    console.log("✅ Output length matches input");
  } else {
    console.log("⚠️ Output length differs from input");
  }

  // Check if output is different from input (processing occurred)
  let hasChanged = false;
  for (let i = 0; i < Math.min(inputBuffer.length, output.length); i++) {
    if (Math.abs(output[i] - inputBuffer[i]) > 1e-6) {
      hasChanged = true;
      break;
    }
  }

  if (hasChanged) {
    console.log("✅ Output differs from input (processing occurred)");
  } else {
    console.log("⚠️ Output identical to input (no processing?)");
  }
} catch (error) {
  console.error("❌ processSync operation failed:", error.message);
  console.error("Stack trace:", error.stack);
  process.exit(1);
}

console.log("🎉 Pipeline processSync test completed successfully!");

// Clean up pipeline
pipeline.dispose();
