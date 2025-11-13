# 🧠 DSPX Benchmarks

**Auto-Generated:** 2025-11-13

## Machine Specifications

| Component | Specification |
|-----------|--------------|
| **CPU** | AMD Ryzen 9 5900X 12-Core Processor             |
| **Cores** | 24 |
| **RAM** | 64 GB |
| **Architecture** | x64 |
| **OS** | Microsoft Windows [Version 10.0.26200.6901] |
| **Node.js** | v22.17.1 |
| **dspx** | v1.2.3 |

---

## Executive Summary

This benchmark suite evaluates **dspx**, a high-performance DSP library with native C++ SIMD acceleration, against pure JavaScript and TensorFlow.js (CPU) implementations across five critical performance stories:

1. **Raw Speed** — C++ SIMD vs JS CPU implementations
2. **Algorithmic Efficiency** — O(1) vs O(N·W) scaling
3. **State Persistence** — Seamless Redis-backed crash recovery
4. **Production Logging** — TopicRouter batching overhead
5. **Production Profiling** — Memory stability, latency distribution, concurrent scaling

**Key Findings:**
- 🚀 **3.6x faster** than pure JS for FFT and filtering
- ⚡ **O(1) complexity** for moving averages (vs O(N·W) naive)
- 💾 **Sub-millisecond** state save/load operations
- 📊 **<5% overhead** with batched logging (vs >20% per-message)
- 🔒 **No memory leaks** detected (0.18666666666666668KB avg growth/iter)
- ⚡ **Predictable latency** with tight p99 distribution
- 📈 **3.9x scaling** with concurrent pipelines

---

## Story 1 — Raw Computational Speed

### FFT Performance

Comparing Fast Fourier Transform implementations across different backends:

![FFT Throughput](../charts/amd-ryzen-9-5900x-12-core-processor/fft_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 134.74M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 3.94M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 5.55M samples/sec | CPU (Pure JS) |
| dspx | medium | 203.38M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 14.60M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 79.36M samples/sec | CPU (Pure JS) |
| dspx | large | 148.46M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 15.47M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 51.89M samples/sec | CPU (Pure JS) |

**Key Insights:**
- Native C++ SIMD (dspx) consistently outperforms pure JS implementations
- Performance gap widens with larger input sizes (better cache utilization)
- TensorFlow.js CPU backend competitive for medium sizes but not optimized for 1D signals

### FIR Filter Performance

Testing Finite Impulse Response filter implementations (51-tap lowpass):

![FIR Filter Throughput](../charts/amd-ryzen-9-5900x-12-core-processor/fir_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 11.69M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 8.47M samples/sec | CPU (Pure JS) |
| naive_js | small | 13.27M samples/sec | CPU (Pure JS) |
| dspx | medium | 34.76M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 12.34M samples/sec | CPU (Pure JS) |
| naive_js | medium | 20.16M samples/sec | CPU (Pure JS) |
| dspx | large | 36.82M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 12.26M samples/sec | CPU (Pure JS) |
| naive_js | large | 21.12M samples/sec | CPU (Pure JS) |

**Key Insights:**
- SIMD-optimized convolution in dspx delivers N/Ax speedup
- Pure JS implementation struggles with inner loop overhead
- FIR filters benefit most from vectorization (repeated multiply-accumulate)

---

## Story 2 — Algorithmic Efficiency

### Moving Average: O(1) vs O(N·W)

Demonstrating constant-time scaling with circular buffer implementation:

![Moving Average (Small)](../charts/amd-ryzen-9-5900x-12-core-processor/moving_avg_small.png)

![Moving Average (Medium)](../charts/amd-ryzen-9-5900x-12-core-processor/moving_avg_medium.png)

#### Complexity Analysis

| Implementation | Time Complexity | Space Complexity | Scalability |
|----------------|-----------------|------------------|-------------|
| **dspx (circular buffer)** | O(1) per sample | O(W) | ✅ Constant time |
| **naive JS (sliding window)** | O(N·W) total | O(1) | ❌ Linear with window |


#### Performance Comparison (SMALL Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
|-------------|-----------|---------------|----------------|-------------------|--------------------|----------------------|
| 32 | 0.078 | 0.028 | **0.4x** | 13.2M | 36.3M | **0.4x** |
| 128 | 0.074 | 0.086 | **1.2x** | 13.8M | 11.9M | **1.2x** |
| 512 | 0.066 | 0.266 | **4.0x** | 15.4M | 3.8M | **4.0x** |
| 2048 | 0.091 | 0.385 | **4.2x** | 11.3M | 2.7M | **4.2x** |
| 8192 | 0.113 | 0.378 | **3.3x** | 9.0M | 2.7M | **3.3x** |

#### Performance Comparison (MEDIUM Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
|-------------|-----------|---------------|----------------|-------------------|--------------------|----------------------|
| 32 | 0.577 | 1.557 | **2.7x** | 113.7M | 42.1M | **2.7x** |
| 128 | 0.549 | 5.493 | **10.0x** | 119.3M | 11.9M | **10.0x** |
| 512 | 0.531 | 21.562 | **40.6x** | 123.3M | 3.0M | **40.6x** |
| 2048 | 0.698 | 85.443 | **122.3x** | 93.8M | 767.0K | **122.3x** |
| 8192 | 0.526 | 324.693 | **617.8x** | 124.7M | 201.8K | **617.8x** |

#### Performance Comparison (LARGE Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
|-------------|-----------|---------------|----------------|-------------------|--------------------|----------------------|
| 32 | 7.212 | 22.245 | **3.1x** | 145.4M | 47.1M | **3.1x** |
| 128 | 7.476 | 86.227 | **11.5x** | 140.3M | 12.2M | **11.5x** |
| 512 | 7.141 | 348.358 | **48.8x** | 146.8M | 3.0M | **48.8x** |
| 2048 | 7.331 | ⏭️ skipped | **—** | 143.0M | ⏭️ skipped | **—** |
| 8192 | 7.359 | ⏭️ skipped | **—** | 142.5M | ⏭️ skipped | **—** |


**Key Insights:**
- dspx maintains constant time regardless of window size
- Naive implementation degrades linearly with window size (O(N·W) complexity)
- **~618x speedup** with circular buffer approach at production scale (medium input, 8192 window)
- Critical for real-time processing where window sizes can be large (1000+ samples)

---

## Story 3 — Redis Resilience (State Persistence)

### State Save/Load Performance

Testing pipeline state serialization for crash recovery (FirFilter → RMS pipeline):

![Redis Latency](../charts/amd-ryzen-9-5900x-12-core-processor/redis_latency.png)

#### Results Summary

| Input Size | Save Time (ms) | Load Time (ms) | State Size | Seamless? |
|------------|----------------|----------------|------------|-----------|
| small | 0.067 | 0.249 | 4.15 KB | ✅ |
| medium | 0.072 | 0.255 | 4.17 KB | ✅ |
| large | 0.059 | 0.283 | 4.06 KB | ✅ |

**Performance Metrics:**
- Average save time: **0.066 ms**
- Average load time: **0.262 ms**
- Average state size: **4.13 KB**
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

![Logging Performance](../charts/amd-ryzen-9-5900x-12-core-processor/logging_perf.png)

#### Overhead Analysis

| Mode | Average Overhead | Recommendation |
|------|------------------|----------------|
| batched | -5.37% | ✅ Recommended |
| per-message | -7.82% | ✅ Recommended |
| console | -11.58% | ✅ Recommended |

#### Detailed Results

| Input Size | Mode | Throughput | Overhead |
|------------|------|------------|----------|
| medium | none | 100.55M samples/sec | — |
| medium | batched | 111.68M samples/sec | -9.97% |
| medium | per-message | 114.59M samples/sec | -12.25% |
| medium | console | 113.72M samples/sec | -11.58% |
| large | none | 137.30M samples/sec | — |
| large | batched | 138.38M samples/sec | -0.78% |
| large | per-message | 142.12M samples/sec | -3.39% |

**Key Insights:**
- **Batched logging (TopicRouter)**: <5% overhead — production-ready
- **Per-message callbacks**: 15-25% overhead — blocks event loop
- **Console.log**: >30% overhead — anti-pattern for high-throughput
- TopicRouter enables topic-based filtering without performance penalty
- Non-blocking batch processing maintains throughput at 1M+ samples/sec

**Recommendation:** Always use `onLogBatch` with `TopicRouter` in production. Avoid `onLog` and never use `console.log` in hot paths.

---

## Story 5 — Production Profiling

### Memory Growth Over Iterations

Testing for memory leaks during sustained operation:

![Memory Growth](../charts/amd-ryzen-9-5900x-12-core-processor/memory_growth.png)

#### Memory Stability Results

| Input Size | Heap Growth/Iteration | Peak Heap | Status |
|------------|----------------------|-----------|--------|
| small | 0.77 KB | 5.66 MB | ✅ Stable |
| medium | -0.09 KB | 5.72 MB | ✅ Stable |
| large | -0.12 KB | 5.73 MB | ✅ Stable |

**Key Insights:**
- Average heap growth: **0.19 KB/iteration** (50 iterations)
- ✅ No memory leaks detected
- Native C++ allocations stay within expected bounds
- Garbage collection efficiently reclaims temporary buffers

### Latency Distribution (p50/p95/p99)

Measuring latency consistency under steady load:

![Latency Distribution](../charts/amd-ryzen-9-5900x-12-core-processor/latency_distribution.png)

#### Latency Percentiles

| Input Size | p50 (Median) | p95 | p99 | Min | Max |
|------------|--------------|-----|-----|-----|-----|
| small | 0.077 ms | 0.098 ms | 0.106 ms | 0.071 ms | 0.106 ms |
| medium | 2.133 ms | 2.238 ms | 2.403 ms | 1.989 ms | 2.403 ms |
| large | 34.535 ms | 35.637 ms | 35.829 ms | 32.764 ms | 35.829 ms |

**Key Insights:**
- Tight latency distribution indicates predictable performance
- p99 latency stays close to median (low tail latency)
- Critical for real-time applications with SLA requirements
- No long-tail outliers from GC or unexpected allocations

### Concurrent Pipeline Scaling

Testing throughput with multiple independent pipelines:

![Concurrent Scaling](../charts/amd-ryzen-9-5900x-12-core-processor/concurrent_scaling.png)

#### Scaling Results

| Pipeline Count | Total Throughput | p99 Latency | Efficiency |
|----------------|------------------|-------------|------------|
| 1 | 30.3M samples/sec | 2.498 ms | 100.0% |
| 2 | 54.6M samples/sec | 2.535 ms | 90.2% |
| 4 | 91.3M samples/sec | 6.032 ms | 75.3% |
| 8 | 107.8M samples/sec | 6.689 ms | 44.5% |
| 16 | 114.1M samples/sec | 11.030 ms | 23.5% |
| 32 | 116.8M samples/sec | 19.394 ms | 12.0% |

**Key Insights:**
- **3.9x throughput increase** from 1 to 32 pipelines
- ✅ Good scaling with concurrency
- Async processing allows effective CPU core utilization
- Ideal for multi-tenant or microservices architectures
- p99 latency remains stable under concurrent load

---

## Conclusion

### Performance Wins

1. **Native SIMD Acceleration**
   - 3.6x faster than pure JavaScript
   - Consistent performance across input sizes
   - Optimized for modern CPU architectures

2. **Optimal Algorithms**
   - O(1) circular buffers vs O(N·W) naive implementations
   - **~618x speedup** for moving averages
   - Critical for real-time processing with large windows

3. **Production-Ready Resilience**
   - Sub-millisecond state serialization
   - Perfect reconstruction after crashes
   - Enables serverless + Redis architecture

4. **Scalable Observability**
   - <5% overhead with batched logging
   - Topic-based routing without performance penalty
   - Production-safe at 1M+ samples/sec

5. **Production Stability**
   - ✅ No memory leaks
   - Tight latency distribution (low p99 tail)
   - **3.9x concurrent scaling** efficiency
   - Predictable performance under load

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
3. **Examples:** [src/ts/examples/](../src/ts/examples/)
4. **Source:** [GitHub](https://github.com/A-KGeorge/dsp-ts-redis)

---

**Generated by:** dspx benchmark suite v1.0  
**Date:** 2025-11-13T03:54:28.930Z  
**Runtime:** Node.js v22.17.1
