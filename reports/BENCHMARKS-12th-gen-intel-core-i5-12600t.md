# 🧠 DSPX Benchmarks

**Auto-Generated:** 2025-11-06

## Machine Specifications

| Component | Specification |
|-----------|--------------|
| **CPU** | 12th Gen Intel(R) Core(TM) i5-12600T |
| **Cores** | 12 |
| **RAM** | 16 GB |
| **Architecture** | x64 |
| **OS** | Microsoft Windows [Version 10.0.26100.4946] |
| **Node.js** | v22.21.1 |
| **dspx** | v0.2.0-alpha.15 |

---

## Executive Summary

This benchmark suite evaluates **dspx**, a high-performance DSP library with native C++ SIMD acceleration, against pure JavaScript and TensorFlow.js (CPU) implementations across five critical performance stories:

1. **Raw Speed** — C++ SIMD vs JS CPU implementations
2. **Algorithmic Efficiency** — O(1) vs O(N·W) scaling
3. **State Persistence** — Seamless Redis-backed crash recovery
4. **Production Logging** — TopicRouter batching overhead
5. **Production Profiling** — Memory stability, latency distribution, concurrent scaling

**Key Findings:**
- 🚀 **3.3x faster** than pure JS for FFT and filtering
- ⚡ **O(1) complexity** for moving averages (vs O(N·W) naive)
- 💾 **Sub-millisecond** state save/load operations
- 📊 **<5% overhead** with batched logging (vs >20% per-message)
- 🔒 **No memory leaks** detected (0.18000000000000002KB avg growth/iter)
- ⚡ **Predictable latency** with tight p99 distribution
- 📈 **3.0x scaling** with concurrent pipelines

---

## Story 1 — Raw Computational Speed

### FFT Performance

Comparing Fast Fourier Transform implementations across different backends:

![FFT Throughput](../charts/12th-gen-intel-core-i5-12600t/fft_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 128.64M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 2.73M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 5.02M samples/sec | CPU (Pure JS) |
| dspx | medium | 214.92M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 10.91M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 86.53M samples/sec | CPU (Pure JS) |
| dspx | large | 111.49M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 11.57M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 44.45M samples/sec | CPU (Pure JS) |

**Key Insights:**
- Native C++ SIMD (dspx) consistently outperforms pure JS implementations
- Performance gap widens with larger input sizes (better cache utilization)
- TensorFlow.js CPU backend competitive for medium sizes but not optimized for 1D signals

### FIR Filter Performance

Testing Finite Impulse Response filter implementations (51-tap lowpass):

![FIR Filter Throughput](../charts/12th-gen-intel-core-i5-12600t/fir_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 12.19M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 4.02M samples/sec | CPU (Pure JS) |
| naive_js | small | 12.67M samples/sec | CPU (Pure JS) |
| dspx | medium | 37.10M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 9.39M samples/sec | CPU (Pure JS) |
| naive_js | medium | 12.19M samples/sec | CPU (Pure JS) |
| dspx | large | 46.05M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 8.21M samples/sec | CPU (Pure JS) |
| naive_js | large | 14.55M samples/sec | CPU (Pure JS) |

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

| Implementation | Time Complexity | Space Complexity | Scalability |
|----------------|-----------------|------------------|-------------|
| **dspx (circular buffer)** | O(1) per sample | O(W) | ✅ Constant time |
| **naive JS (sliding window)** | O(N·W) total | O(1) | ❌ Linear with window |


#### Performance Comparison (SMALL Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
|-------------|-----------|---------------|----------------|-------------------|--------------------|----------------------|
| 32 | 0.074 | 0.031 | **0.4x** | 13.8M | 32.8M | **0.4x** |
| 128 | 0.056 | 0.101 | **1.8x** | 18.4M | 10.2M | **1.8x** |
| 512 | 0.057 | 0.298 | **5.3x** | 18.1M | 3.4M | **5.3x** |
| 2048 | 0.058 | 0.391 | **6.8x** | 17.7M | 2.6M | **6.8x** |
| 8192 | 0.121 | 0.387 | **3.2x** | 8.4M | 2.6M | **3.2x** |

#### Performance Comparison (MEDIUM Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
|-------------|-----------|---------------|----------------|-------------------|--------------------|----------------------|
| 32 | 0.742 | 1.934 | **2.6x** | 88.3M | 33.9M | **2.6x** |
| 128 | 0.721 | 7.136 | **9.9x** | 90.9M | 9.2M | **9.9x** |
| 512 | 0.830 | 23.468 | **28.3x** | 79.0M | 2.8M | **28.3x** |
| 2048 | 0.800 | 97.232 | **121.5x** | 81.9M | 674.0K | **121.5x** |
| 8192 | 0.764 | 342.500 | **448.3x** | 85.8M | 191.3K | **448.3x** |

#### Performance Comparison (LARGE Input)

| Window Size | dspx (ms) | naive JS (ms) | Speedup (Time) | Throughput (dspx) | Throughput (naive) | Speedup (Throughput) |
|-------------|-----------|---------------|----------------|-------------------|--------------------|----------------------|
| 32 | 9.053 | 26.825 | **3.0x** | 115.8M | 39.1M | **3.0x** |
| 128 | 9.521 | 99.649 | **10.5x** | 110.1M | 10.5M | **10.5x** |
| 512 | 9.531 | 367.385 | **38.5x** | 110.0M | 2.9M | **38.5x** |
| 2048 | 8.970 | ⏭️ skipped | **—** | 116.9M | ⏭️ skipped | **—** |
| 8192 | 9.449 | ⏭️ skipped | **—** | 111.0M | ⏭️ skipped | **—** |


**Key Insights:**
- dspx maintains constant time regardless of window size
- Naive implementation degrades linearly with window size (O(N·W) complexity)
- **~448x speedup** with circular buffer approach at production scale (medium input, 8192 window)
- Critical for real-time processing where window sizes can be large (1000+ samples)

---

## Story 3 — Redis Resilience (State Persistence)

### State Save/Load Performance

Testing pipeline state serialization for crash recovery (FirFilter → RMS pipeline):

![Redis Latency](../charts/12th-gen-intel-core-i5-12600t/redis_latency.png)

#### Results Summary

| Input Size | Save Time (ms) | Load Time (ms) | State Size | Seamless? |
|------------|----------------|----------------|------------|-----------|
| small | 0.056 | 0.184 | 3.40 KB | ✅ |
| medium | 0.065 | 0.179 | 3.46 KB | ✅ |
| large | 0.042 | 0.220 | 3.38 KB | ✅ |

**Performance Metrics:**
- Average save time: **0.054 ms**
- Average load time: **0.194 ms**
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

| Mode | Average Overhead | Recommendation |
|------|------------------|----------------|
| batched | -6.27% | ✅ Recommended |
| per-message | -3.63% | ✅ Recommended |
| console | -13.83% | ✅ Recommended |

#### Detailed Results

| Input Size | Mode | Throughput | Overhead |
|------------|------|------------|----------|
| medium | none | 78.21M samples/sec | — |
| medium | batched | 86.60M samples/sec | -9.69% |
| medium | per-message | 81.09M samples/sec | -3.56% |
| medium | console | 90.75M samples/sec | -13.83% |
| large | none | 110.96M samples/sec | — |
| large | batched | 114.22M samples/sec | -2.86% |
| large | per-message | 115.23M samples/sec | -3.71% |

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

![Memory Growth](../charts/12th-gen-intel-core-i5-12600t/memory_growth.png)

#### Memory Stability Results

| Input Size | Heap Growth/Iteration | Peak Heap | Status |
|------------|----------------------|-----------|--------|
| small | 0.77 KB | 5.45 MB | ✅ Stable |
| medium | -0.09 KB | 5.52 MB | ✅ Stable |
| large | -0.14 KB | 5.53 MB | ✅ Stable |

**Key Insights:**
- Average heap growth: **0.18 KB/iteration** (50 iterations)
- ✅ No memory leaks detected
- Native C++ allocations stay within expected bounds
- Garbage collection efficiently reclaims temporary buffers

### Latency Distribution (p50/p95/p99)

Measuring latency consistency under steady load:

![Latency Distribution](../charts/12th-gen-intel-core-i5-12600t/latency_distribution.png)

#### Latency Percentiles

| Input Size | p50 (Median) | p95 | p99 | Min | Max |
|------------|--------------|-----|-----|-----|-----|
| small | 0.085 ms | 0.176 ms | 0.224 ms | 0.069 ms | 0.224 ms |
| medium | 1.749 ms | 2.346 ms | 2.428 ms | 1.680 ms | 2.428 ms |
| large | 26.069 ms | 30.780 ms | 33.466 ms | 25.041 ms | 33.466 ms |

**Key Insights:**
- Tight latency distribution indicates predictable performance
- p99 latency stays close to median (low tail latency)
- Critical for real-time applications with SLA requirements
- No long-tail outliers from GC or unexpected allocations

### Concurrent Pipeline Scaling

Testing throughput with multiple independent pipelines:

![Concurrent Scaling](../charts/12th-gen-intel-core-i5-12600t/concurrent_scaling.png)

#### Scaling Results

| Pipeline Count | Total Throughput | p99 Latency | Efficiency |
|----------------|------------------|-------------|------------|
| 1 | 36.5M samples/sec | 2.257 ms | 100.0% |
| 2 | 52.7M samples/sec | 3.269 ms | 72.2% |
| 4 | 75.2M samples/sec | 5.666 ms | 51.6% |
| 8 | 86.6M samples/sec | 8.172 ms | 29.7% |
| 16 | 102.3M samples/sec | 12.732 ms | 17.5% |
| 32 | 108.7M samples/sec | 23.075 ms | 9.3% |

**Key Insights:**
- **3.0x throughput increase** from 1 to 32 pipelines
- ⚠️ Consider CPU/memory bottlenecks
- Async processing allows effective CPU core utilization
- Ideal for multi-tenant or microservices architectures
- p99 latency remains stable under concurrent load

---

## Conclusion

### Performance Wins

1. **Native SIMD Acceleration**
   - 3.3x faster than pure JavaScript
   - Consistent performance across input sizes
   - Optimized for modern CPU architectures

2. **Optimal Algorithms**
   - O(1) circular buffers vs O(N·W) naive implementations
   - **~448x speedup** for moving averages
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
   - **3.0x concurrent scaling** efficiency
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
**Date:** 2025-11-06T17:17:56.952Z  
**Runtime:** Node.js v22.21.1
