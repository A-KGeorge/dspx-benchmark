import { createDspPipeline } from "dspx";

const pipeline = createDspPipeline().MovingAverage({
  mode: "moving",
  windowDuration: 2,
});

const input = new Float32Array([1, 2, 3, 4, 5]);
const Fs = 1000;
const dt = 1000 / Fs; // in ms

const timestamps = new Float32Array(input.length);
for (let i = 0; i < input.length; i++) {
  timestamps[i] = i * dt;
}

const output = await pipeline.process(input, timestamps, { channels: 1 });

console.log("Output: ", output);
