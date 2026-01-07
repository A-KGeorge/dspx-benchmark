import { createDspPipeline } from "dspx";

const pipeline = createDspPipeline().MovingAverage({
  mode: "moving",
  windowDuration: 2, //2ms
  // windowSize: 2,
});

const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const Fs = 1000;
const dt = 1000 / Fs; // in ms

const timestamps = new Float32Array(input.length);
// Ensure timestamps are irregularly spaced
for (let i = 0; i < input.length; i++) {
  timestamps[i] = i * dt + 4 * Math.random();
  timestamps[i] = timestamps[i] - 2 < 0 ? timestamps[i] : timestamps[i] - 2;
}
timestamps.sort((a, b) => a - b); // Ensure timestamps are sorted

console.log(
  "timestamps:",
  Array.from(timestamps)
    .map((t) => t.toFixed(5))
    .join(", ")
);

const output = await pipeline.process(input, timestamps, { channels: 1 });

console.log("Output: ", Array.from(output));

pipeline.dispose();
