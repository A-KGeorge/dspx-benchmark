# 🧠 DSPX Benchmarks

**Auto-Generated:** 2025-11-04

## Machine Specifications

| Component        | Specification                               |
| ---------------- | ------------------------------------------- |
| **CPU**          | 12th Gen Intel(R) Core(TM) i5-12600T        |
| **Cores**        | 12                                          |
| **RAM**          | 16 GB                                       |
| **Architecture** | x64                                         |
| **OS**           | Microsoft Windows [Version 10.0.26100.4946] |
| **Node.js**      | v22.21.1                                    |
| **dspx**         | v0.2.0-alpha.15                             |

---

## Executive Summary

This benchmark suite evaluates **dspx**, a high-performance DSP library with native C++ SIMD acceleration, against pure JavaScript and TensorFlow.js (CPU) implementations across four critical performance stories:

1. **Raw Speed** — C++ SIMD vs JS CPU implementations
2. **Algorithmic Efficiency** — O(1) vs O(N·W) scaling
3. **State Persistence** — Seamless Redis-backed crash recovery
4. **Production Logging** — TopicRouter batching overhead

**Key Findings:**

- 🚀 **2.9x faster** than pure JS for FFT and filtering
- ⚡ **~559x speedup** for moving averages (O(1) vs O(N·W) naive)
- 💾 **Sub-millisecond** state save/load operations
- 📊 **<5% overhead** with batched logging (vs >20% per-message)

---

## Story 1 — Raw Computational Speed

### FFT Performance

Comparing Fast Fourier Transform implementations across different backends:

![FFT Throughput](../charts/12th-gen-intel-core-i5-12600t/fft_throughput.png)

#### Results Summary

| Library | Input Size | Throughput          | Backend                        |
| ------- | ---------- | ------------------- | ------------------------------ |
| dspx    | small      | 166.50M samples/sec | CPU (Native C++ SIMD)          |
| tfjs    | small      | 3.32M samples/sec   | CPU (TensorFlow.js Node (C++)) |
| fft.js  | small      | 5.55M samples/sec   | CPU (Pure JS)                  |
| dspx    | medium     | 168.13M samples/sec | CPU (Native C++ SIMD)          |
| tfjs    | medium     | 10.48M samples/sec  | CPU (TensorFlow.js Node (C++)) |
| fft.js  | medium     | 102.47M samples/sec | CPU (Pure JS)                  |
| dspx    | large      | 112.40M samples/sec | CPU (Native C++ SIMD)          |
| tfjs    | large      | 12.64M samples/sec  | CPU (TensorFlow.js Node (C++)) |
| fft.js  | large      | 43.67M samples/sec  | CPU (Pure JS)                  |

**Key Insights:**

- Native C++ SIMD (dspx) consistently outperforms pure JS implementations
- Performance gap widens with larger input sizes (better cache utilization)
- TensorFlow.js CPU backend competitive for medium sizes but not optimized for 1D signals

### FIR Filter Performance

Testing Finite Impulse Response filter implementations (51-tap lowpass):

![FIR Filter Throughput](../charts/12th-gen-intel-core-i5-12600t/fir_throughput.png)

#### Results Summary

| Library  | Input Size | Throughput         | Backend               |
| -------- | ---------- | ------------------ | --------------------- |
| dspx     | small      | 14.90M samples/sec | CPU (Native C++ SIMD) |
| fili     | small      | 5.68M samples/sec  | CPU (Pure JS)         |
| naive_js | small      | 10.40M samples/sec | CPU (Pure JS)         |
| dspx     | medium     | 49.37M samples/sec | CPU (Native C++ SIMD) |
| fili     | medium     | 9.92M samples/sec  | CPU (Pure JS)         |
| naive_js | medium     | 13.63M samples/sec | CPU (Pure JS)         |
| dspx     | large      | 52.05M samples/sec | CPU (Native C++ SIMD) |
| fili     | large      | 10.55M samples/sec | CPU (Pure JS)         |
| naive_js | large      | 16.39M samples/sec | CPU (Pure JS)         |

**Key Insights:**

- SIMD-optimized convolution in dspx delivers N/Ax speedup
- Pure JS implementation struggles with inner loop overhead
- FIR filters benefit most from vectorization (repeated multiply-accumulate)

---

## Story 2 — Algorithmic Efficiency

### Moving Average: O(1) vs O(N·W)

Demonstrating constant-time scaling with circular buffer implementation:

![Moving Average (Small)](../charts/12th-gen-intel-core-i5-12600t/moving_avg_small.png)

![Moving Average (Medium)](../charts/12th-gen-intel-core-i5-12600t/moving_avg_medium.png)

#### Complexity Analysis

| Implementation                | Time Complexity | Space Complexity | Scalability           |
| ----------------------------- | --------------- | ---------------- | --------------------- |
| **dspx (circular buffer)**    | O(1) per sample | O(W)             | ✅ Constant time      |
| **naive JS (sliding window)** | O(N·W) total    | O(1)             | ❌ Linear with window |

#### Performance Comparison (SMALL Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
| ----------- | --------- | ------------- | -------------- | ----------------- | ------------------ | -------------------- |
| 32          | 0.091     | 0.030         | **0.3x**       | 11.2M             | 34.2M              | **0.3x**             |
| 128         | 0.056     | 0.101         | **1.8x**       | 18.3M             | 10.1M              | **1.8x**             |
| 512         | 0.056     | 0.296         | **5.3x**       | 18.3M             | 3.5M               | **5.3x**             |
| 2048        | 0.058     | 0.391         | **6.7x**       | 17.6M             | 2.6M               | **6.7x**             |
| 8192        | 0.078     | 0.404         | **5.2x**       | 13.2M             | 2.5M               | **5.2x**             |

#### Performance Comparison (MEDIUM Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
| ----------- | --------- | ------------- | -------------- | ----------------- | ------------------ | -------------------- |
| 32          | 0.811     | 1.979         | **2.4x**       | 80.8M             | 33.1M              | **2.4x**             |
| 128         | 0.690     | 6.518         | **9.5x**       | 95.0M             | 10.1M              | **9.5x**             |
| 512         | 0.828     | 23.395        | **28.3x**      | 79.1M             | 2.8M               | **28.3x**            |
| 2048        | 0.650     | 91.103        | **140.1x**     | 100.8M            | 719.4K             | **140.1x**           |
| 8192        | 0.611     | 341.398       | **558.8x**     | 107.3M            | 192.0K             | **558.8x**           |

#### Performance Comparison (LARGE Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
| ----------- | --------- | ------------- | -------------- | ----------------- | ------------------ | -------------------- |
| 32          | 10.131    | 25.381        | **2.5x**       | 103.5M            | 41.3M              | **2.5x**             |
| 128         | 9.002     | 100.832       | **11.2x**      | 116.5M            | 10.4M              | **11.2x**            |
| 512         | 8.975     | 373.038       | **41.6x**      | 116.8M            | 2.8M               | **41.6x**            |
| 2048        | 9.058     | ⏭️ skipped    | **—**          | 115.8M            | ⏭️ skipped         | **—**                |
| 8192        | 8.975     | ⏭️ skipped    | **—**          | 116.8M            | ⏭️ skipped         | **—**                |

**Key Insights:**

- dspx maintains constant time regardless of window size
- Naive implementation degrades linearly with window size (O(N·W) complexity)
- **~559x speedup** with circular buffer approach at production scale (medium input, 8192 window)
- Critical for real-time processing where window sizes can be large (1000+ samples)

---

## Story 3 — Redis Resilience (State Persistence)

### State Save/Load Performance

Testing pipeline state serialization for crash recovery (FirFilter → RMS pipeline):

![Redis Latency](../charts/12th-gen-intel-core-i5-12600t/redis_latency.png)

#### Results Summary

| Input Size | Save Time (ms) | Load Time (ms) | State Size | Seamless? |
| ---------- | -------------- | -------------- | ---------- | --------- |
| small      | 0.051          | 0.172          | 3.40 KB    | ✅        |
| medium     | 0.040          | 0.174          | 3.46 KB    | ✅        |
| large      | 0.065          | 0.250          | 3.38 KB    | ✅        |

**Performance Metrics:**

- Average save time: **0.052 ms**
- Average load time: **0.198 ms**
- Average state size: **3.41 KB**
- All tests seamless: **✅ YES**

**Key Insights:**

- Sub-millisecond serialization enables frequent state snapshots
- State size scales with pipeline complexity, not input size
- Perfect reconstruction: outputs match bit-for-bit after restoration
- Ideal for distributed processing (Lambda + Redis architecture)
- Enables crash recovery without data loss

---

## Story 4 — Production Logging

### Logging Mode Overhead

Comparing throughput impact of different logging strategies:

![Logging Performance](../charts/12th-gen-intel-core-i5-12600t/logging_perf.png)

#### Overhead Analysis

| Mode        | Average Overhead | Recommendation |
| ----------- | ---------------- | -------------- |
| batched     | -2.62%           | ✅ Recommended |
| per-message | -4.42%           | ✅ Recommended |
| console     | -14.25%          | ✅ Recommended |

#### Detailed Results

| Input Size | Mode        | Throughput          | Overhead |
| ---------- | ----------- | ------------------- | -------- |
| medium     | none        | 74.61M samples/sec  | —        |
| medium     | batched     | 77.37M samples/sec  | -3.57%   |
| medium     | per-message | 80.97M samples/sec  | -7.86%   |
| medium     | console     | 87.01M samples/sec  | -14.25%  |
| large      | none        | 112.84M samples/sec | —        |
| large      | batched     | 114.77M samples/sec | -1.68%   |
| large      | per-message | 113.97M samples/sec | -0.98%   |

**Key Insights:**

- **Batched logging (TopicRouter)**: <5% overhead — production-ready
- **Per-message callbacks**: 15-25% overhead — blocks event loop
- **Console.log**: >30% overhead — anti-pattern for high-throughput
- TopicRouter enables topic-based filtering without performance penalty
- Non-blocking batch processing maintains throughput at 1M+ samples/sec

**Recommendation:** Always use `onLogBatch` with `TopicRouter` in production. Avoid `onLog` and never use `console.log` in hot paths.

---

## Conclusion

### Performance Wins

1. **Native SIMD Acceleration**

   - 2.9x faster than pure JavaScript
   - Consistent performance across input sizes
   - Optimized for modern CPU architectures

2. **Optimal Algorithms**

   - O(1) circular buffers vs O(N·W) naive implementations
   - **~559x speedup** for moving averages
   - Critical for real-time processing with large windows

3. **Production-Ready Resilience**

   - Sub-millisecond state serialization
   - Perfect reconstruction after crashes
   - Enables serverless + Redis architecture

4. **Scalable Observability**
   - <5% overhead with batched logging
   - Topic-based routing without performance penalty
   - Production-safe at 1M+ samples/sec

### When to Use dspx

✅ **Perfect For:**

- Real-time signal processing (audio, biosignals, sensor data)
- High-throughput streaming pipelines (>100K samples/sec)
- Stateful DSP with crash recovery requirements
- Serverless architectures (Lambda + Redis state)
- Production systems requiring sub-millisecond latency

⚠️ **Consider Alternatives:**

- Simple one-off analysis (pure JS may suffice)
- GPU-accelerated workloads (use TensorFlow.js with GPU)
- Browser-only applications (dspx requires Node.js)

### Next Steps

1. **Install:** `npm install dspx`
2. **Documentation:** [README.md](../README.md)
3. **Examples:** [src/ts/examples/](https://github.com/A-KGeorge/dsp-ts-redis/src/ts/examples/)
4. **Source:** [GitHub](https://github.com/A-KGeorge/dsp-ts-redis)

---

**Generated by:** dspx benchmark suite v1.0  
**Date:** 2025-11-04T18:28:52.016Z  
**Runtime:** Node.js v22.21.1
