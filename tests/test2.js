import { createDspPipeline } from "dspx";

const pipeline = createDspPipeline().MovingAverage({
  mode: "moving",
  windowDuration: 2, //2ms
  // windowSize: 2,
});

const input = new Float32Array(Array.from({ length: 10 }, (_, i) => i + 1));
const Fs = 1000;
const dt = 1000 / Fs; // in ms

const timestamps = new Float32Array(input.length);
// Ensure timestamps are irregularly spaced
for (let i = 0; i < input.length; i++) {
  timestamps[i] = i * dt + 4 * Math.random();
  timestamps[i] = timestamps[i] - 2 < 0 ? timestamps[i] : timestamps[i] - 2;
}
timestamps.sort((a, b) => a - b); // Ensure timestamps are sorted

console.log("timestamps:", Array.from(timestamps));

const start = performance.now();
const output = await pipeline.process(input, timestamps, { channels: 1 });
const end = performance.now();
console.log("Time taken:", end - start, "ms");

console.log("Output: ", Array.from(output));

pipeline.dispose();
