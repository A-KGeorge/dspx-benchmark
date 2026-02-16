import { performance } from "node:perf_hooks";
import { createDspPipeline } from "dspx";

const INPUT_SIZES = [
  { name: "small", length: 1024, desc: "Fits in L1 cache" },
  { name: "medium", length: 65536, desc: "Fits in L3 cache" },
  { name: "large", length: 1048576, desc: "Main-memory scale" },
];

export async function runTimed(name, fn, warmups = 2, reps = 5) {
  // Warmup runs
  for (let i = 0; i < warmups; i++) {
    await fn();
  }

  // Actual benchmark runs
  const times = [];
  const memBefore = process.memoryUsage().heapUsed;

  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }

  const memAfter = process.memoryUsage().heapUsed;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p99 = max; // With small samples, max is essentially p99

  return {
    avg,
    min,
    max,
    p99,
    rss: process.memoryUsage().rss,
    heapUsed: memAfter - memBefore,
    times,
  };
}

const WINDOW_SIZES = [32, 128, 512, 2048, 8192];

for (const size of INPUT_SIZES) {
  const signal = new Float32Array(size.length);
  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `Input: ${size.name.toUpperCase()} (${size.length.toLocaleString()} samples)`,
  );
  console.log("=".repeat(80));
  for (const windowSize of WINDOW_SIZES) {
    try {
      console.log(`   ⏳ Warming up...`);

      // Create a pipeline for warmup
      let warmupPipeline = createDspPipeline();
      warmupPipeline.MovingAverage({ mode: "moving", windowSize });

      // Warm up JIT and allocate memory (5 iterations)
      for (let i = 0; i < 5; i++) {
        await warmupPipeline.process(signal, {
          sampleRate: 10000,
          channels: 1,
        });
      }

      // Release warmup pipeline
      warmupPipeline.dispose();
      warmupPipeline = null;

      // ✅ FIX: Now measure steady-state performance
      // Since we can't reset, we'll create fresh pipeline but with warmed JIT
      const result = await runTimed(
        `dspx-ma-${windowSize}`,
        async () => {
          // Create fresh pipeline for each iteration to ensure independence
          const pipeline = createDspPipeline();
          pipeline.MovingAverage({ mode: "moving", windowSize });

          const output = await pipeline.process(signal, {
            sampleRate: 10000,
            channels: 1,
          });

          pipeline.dispose();
          return output;
        },
        0, // No additional warmup needed (already done)
        10, // More reps for better statistics
      );

      console.log(`   dspx (O(1)):       ${result.avg.toFixed(3)} ms`);
      console.log(
        `   Throughput:        ${(
          ((size.length / result.avg) * 1000) /
          1e6
        ).toFixed(1)}M samples/sec`,
      );
    } catch (e) {
      console.error(`   ❌ dspx failed:`, e.message);
    }
  }
}
