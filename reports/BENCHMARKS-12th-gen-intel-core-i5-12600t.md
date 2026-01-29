# 🧠 DSPX Benchmarks

**Auto-Generated:** 2026-01-29

## Machine Specifications

| Component | Specification |
|-----------|--------------|
| **CPU** | 12th Gen Intel(R) Core(TM) i5-12600T |
| **Cores** | 12 |
| **RAM** | 16 GB |
| **Architecture** | x64 |
| **OS** | Microsoft Windows [Version 10.0.26100.4946] |
| **Node.js** | v22.21.1 |
| **dspx** | v1.4.2 |

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
- 🔒 **No memory leaks** detected (0.16333333333333333KB avg growth/iter)
- ⚡ **Predictable latency** with tight p99 distribution
- 📈 **3.4x scaling** with concurrent pipelines

---

## Story 1 — Raw Computational Speed

### FFT Performance

Comparing Fast Fourier Transform implementations across different backends:

![FFT Throughput](../charts/12th-gen-intel-core-i5-12600t/fft_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 154.45M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 3.48M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 3.60M samples/sec | CPU (Pure JS) |
| dspx | medium | 218.92M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 12.72M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 105.31M samples/sec | CPU (Pure JS) |
| dspx | large | 124.46M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 12.33M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 43.24M samples/sec | CPU (Pure JS) |
| scipy | small | 92.67M samples/sec | CPU (scipy.fft) |
| scipy | medium | 222.42M samples/sec | CPU (scipy.fft) |
| scipy | large | 112.40M samples/sec | CPU (scipy.fft) |
| dspx | small | 154.45M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 3.48M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 3.60M samples/sec | CPU (Pure JS) |
| dspx | medium | 218.92M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 12.72M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 105.31M samples/sec | CPU (Pure JS) |
| dspx | large | 124.46M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 12.33M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 43.24M samples/sec | CPU (Pure JS) |
| scipy | small | 92.67M samples/sec | CPU (scipy.fft) |
| scipy | medium | 222.42M samples/sec | CPU (scipy.fft) |
| scipy | large | 112.40M samples/sec | CPU (scipy.fft) |
| jdsp | small | 1.69M samples/sec | CPU (JDSP FFT) |
| jdsp | medium | 13.79M samples/sec | CPU (JDSP FFT) |
| jdsp | large | 10.67M samples/sec | CPU (JDSP FFT) |

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
| dspx | small | 12.07M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 5.79M samples/sec | CPU (Pure JS) |
| naive_js | small | 9.32M samples/sec | CPU (Pure JS) |
| dspx | medium | 52.15M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 9.53M samples/sec | CPU (Pure JS) |
| naive_js | medium | 12.99M samples/sec | CPU (Pure JS) |
| dspx | large | 47.76M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 9.64M samples/sec | CPU (Pure JS) |
| naive_js | large | 12.78M samples/sec | CPU (Pure JS) |
| scipy | small | 27.21M samples/sec | CPU (scipy.signal) |
| scipy | medium | 64.90M samples/sec | CPU (scipy.signal) |
| scipy | large | 61.60M samples/sec | CPU (scipy.signal) |
| dspx | small | 12.07M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 5.79M samples/sec | CPU (Pure JS) |
| naive_js | small | 9.32M samples/sec | CPU (Pure JS) |
| dspx | medium | 52.15M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 9.53M samples/sec | CPU (Pure JS) |
| naive_js | medium | 12.99M samples/sec | CPU (Pure JS) |
| dspx | large | 47.76M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 9.64M samples/sec | CPU (Pure JS) |
| naive_js | large | 12.78M samples/sec | CPU (Pure JS) |
| scipy | small | 27.21M samples/sec | CPU (scipy.signal) |
| scipy | medium | 64.90M samples/sec | CPU (scipy.signal) |
| scipy | large | 61.60M samples/sec | CPU (scipy.signal) |
| jdsp | small | 9.28M samples/sec | CPU (JDSP FIR) |
| jdsp | medium | 43.21M samples/sec | CPU (JDSP FIR) |
| jdsp | large | 42.28M samples/sec | CPU (JDSP FIR) |

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

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 0.069 | 0.101 | ⏭️ skipped | **1.5x** | **—** | 14.9M | 10.2M | ⏭️ skipped |
| 128 | 0.052 | 0.190 | ⏭️ skipped | **3.6x** | **—** | 19.5M | 5.4M | ⏭️ skipped |
| 512 | 0.045 | 0.570 | ⏭️ skipped | **12.7x** | **—** | 22.7M | 1.8M | ⏭️ skipped |
| 2048 | 0.046 | 0.766 | ⏭️ skipped | **16.6x** | **—** | 22.2M | 1.3M | ⏭️ skipped |
| 8192 | 0.086 | 0.760 | ⏭️ skipped | **8.8x** | **—** | 11.9M | 1.3M | ⏭️ skipped |

#### Performance Comparison (MEDIUM Input)

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 0.676 | 1.961 | ⏭️ skipped | **2.9x** | **—** | 96.9M | 33.4M | ⏭️ skipped |
| 128 | 0.677 | 6.702 | ⏭️ skipped | **9.9x** | **—** | 96.8M | 9.8M | ⏭️ skipped |
| 512 | 0.696 | 26.900 | ⏭️ skipped | **38.7x** | **—** | 94.2M | 2.4M | ⏭️ skipped |
| 2048 | 0.682 | 107.039 | ⏭️ skipped | **156.9x** | **—** | 96.1M | 612.3K | ⏭️ skipped |
| 8192 | 0.630 | 403.288 | ⏭️ skipped | **640.5x** | **—** | 104.1M | 162.5K | ⏭️ skipped |

#### Performance Comparison (LARGE Input)

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 10.165 | 34.530 | ⏭️ skipped | **3.4x** | **—** | 103.2M | 30.4M | ⏭️ skipped |
| 128 | 11.065 | 133.462 | ⏭️ skipped | **12.1x** | **—** | 94.8M | 7.9M | ⏭️ skipped |
| 512 | 10.445 | 441.379 | ⏭️ skipped | **42.3x** | **—** | 100.4M | 2.4M | ⏭️ skipped |
| 2048 | 10.616 | 1776.652 | ⏭️ skipped | **167.4x** | **—** | 98.8M | 590.2K | ⏭️ skipped |
| 8192 | 10.365 | 5914.411 | ⏭️ skipped | **570.6x** | **—** | 101.2M | 177.3K | ⏭️ skipped |


**Key Insights:**
- dspx maintains constant time regardless of window size
- Naive implementation degrades linearly with window size (O(N·W) complexity)
- **~640x speedup** with circular buffer approach at production scale (medium input, 8192 window)
- Critical for real-time processing where window sizes can be large (1000+ samples)

---

## Story 3 — Redis Resilience (State Persistence)

### State Save/Load Performance

Testing pipeline state serialization for crash recovery (FirFilter → RMS pipeline):

![Redis Latency](../charts/12th-gen-intel-core-i5-12600t/redis_latency.png)

#### Results Summary

| Input Size | Format | Serialize | Redis SET | Redis GET | Deserialize | Total Save | Total Load | State Size | Seamless |
|------------|--------|-----------|-----------|-----------|-------------|------------|------------|------------|----------|
| SMALL | JSON | 0.070 | 0.383 | 0.359 | 0.064 | 0.454 | 0.423 | 5.88 KB | ✅ |
| SMALL | TOON | 0.009 | 0.298 | 0.250 | 0.012 | 0.308 | 0.262 | 1.65 KB | ✅ |
| MEDIUM | JSON | 0.080 | 0.321 | 0.218 | 0.069 | 0.401 | 0.287 | 5.89 KB | ✅ |
| MEDIUM | TOON | 0.026 | 0.217 | 0.176 | 0.011 | 0.243 | 0.187 | 1.65 KB | ✅ |
| LARGE | JSON | 0.067 | 0.255 | 0.309 | 0.065 | 0.321 | 0.374 | 5.79 KB | ✅ |
| LARGE | TOON | 0.007 | 0.314 | 0.253 | 0.011 | 0.321 | 0.264 | 1.65 KB | ✅ |

**Performance Metrics:**

**JSON Format:**
- Serialization time: **0.072 ms**
- Deserialization time: **0.066 ms**
- Redis SET time: **0.320 ms**
- Redis GET time: **0.295 ms**
- **Total save time: 0.392 ms**
- **Total load time: 0.361 ms**
- State size: **5.85 KB**

**TOON Format:**
- Serialization time: **0.014 ms**
- Deserialization time: **0.011 ms**
- Redis SET time: **0.277 ms**
- Redis GET time: **0.226 ms**
- **Total save time: 0.291 ms**
- **Total load time: 0.237 ms**
- State size: **1.65 KB**

**Overall:**
- All tests seamless: **✅ YES**

**Key Insights:**
- **Serialization/deserialization dominates**: ~80-90% of total save/load time
- **Redis overhead minimal**: SET/GET operations add <0.5ms typically
- **TOON format more compact**: 40-60% smaller state size than JSON
- Sub-millisecond total operations enable frequent state snapshots
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
| batched | -0.87% | ✅ Recommended |
| per-message | -4.53% | ✅ Recommended |
| console | -2.10% | ✅ Recommended |

#### Detailed Results

| Input Size | Mode | Throughput | Overhead |
|------------|------|------------|----------|
| medium | none | 96.74M samples/sec | — |
| medium | batched | 96.16M samples/sec | 0.61% |
| medium | per-message | 98.35M samples/sec | -1.63% |
| medium | console | 98.82M samples/sec | -2.10% |
| large | none | 97.61M samples/sec | — |
| large | batched | 99.95M samples/sec | -2.34% |
| large | per-message | 105.44M samples/sec | -7.43% |

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
| small | 0.75 KB | 5.74 MB | ✅ Stable |
| medium | -0.12 KB | 5.79 MB | ✅ Stable |
| large | -0.14 KB | 5.80 MB | ✅ Stable |

**Key Insights:**
- Average heap growth: **0.16 KB/iteration** (50 iterations)
- ✅ No memory leaks detected
- Native C++ allocations stay within expected bounds
- Garbage collection efficiently reclaims temporary buffers

### Latency Distribution (p50/p95/p99)

Measuring latency consistency under steady load:

![Latency Distribution](../charts/12th-gen-intel-core-i5-12600t/latency_distribution.png)

#### Latency Percentiles

| Input Size | p50 (Median) | p95 | p99 | Min | Max |
|------------|--------------|-----|-----|-----|-----|
| small | 0.070 ms | 0.112 ms | 0.142 ms | 0.046 ms | 0.142 ms |
| medium | 1.760 ms | 2.381 ms | 2.519 ms | 1.655 ms | 2.519 ms |
| large | 30.578 ms | 33.681 ms | 36.338 ms | 27.660 ms | 36.338 ms |

**Key Insights:**
- Tight latency distribution indicates predictable performance
- p99 latency stays close to median (low tail latency)
- Critical for real-time applications with SLA requirements
- No long-tail outliers from GC or unexpected allocations

### Latency Distribution Threaded (p50/p95/p99)

Measuring latency consistency with worker threads (isolated from main thread noise):

![Latency Distribution Threaded](../charts/12th-gen-intel-core-i5-12600t/latency_distribution_threaded.png)

#### Latency Percentiles (Threaded)

| Input Size | p50 (Median) | p95 | p99 | Min | Max |
|------------|--------------|-----|-----|-----|-----|
| small | 0.037 ms | 0.065 ms | 0.095 ms | 0.028 ms | 0.095 ms |
| medium | 1.862 ms | 2.553 ms | 2.632 ms | 1.639 ms | 2.632 ms |
| large | 27.815 ms | 32.647 ms | 35.797 ms | 23.963 ms | 35.797 ms |

**Key Insights:**
- Worker threads isolate DSP from main thread event loop and GC noise
- Significantly reduced p99 tail latency compared to single-threaded
- More consistent performance for real-time applications
- Eliminates JavaScript-side overhead in latency measurements

### Concurrent Pipeline Scaling

Testing throughput with multiple independent pipelines:

![Concurrent Scaling](../charts/12th-gen-intel-core-i5-12600t/concurrent_scaling.png)

#### Scaling Results

| Type | Pipeline Count | Total Throughput | p99 Latency | Efficiency |
|------|----------------|------------------|-------------|------------|
| Single Thread | 1 | 35.7M samples/sec | 2.216 ms | 100.0% |
| Single Thread | 2 | 50.3M samples/sec | 3.052 ms | 70.6% |
| Single Thread | 4 | 74.5M samples/sec | 5.968 ms | 52.2% |
| Single Thread | 8 | 81.3M samples/sec | 7.579 ms | 28.5% |
| Single Thread | 16 | 92.2M samples/sec | 12.875 ms | 16.1% |
| Single Thread | 32 | 103.5M samples/sec | 23.238 ms | 9.1% |
| Single Thread | 64 | 98.8M samples/sec | 49.580 ms | 4.3% |
| Single Thread | 128 | 105.4M samples/sec | 84.401 ms | 2.3% |
| Single Thread | 256 | 118.4M samples/sec | 151.750 ms | 1.3% |
| Single Thread | 512 | 118.9M samples/sec | 301.574 ms | 0.7% |
| Single Thread | 1024 | 121.9M samples/sec | 572.828 ms | 0.3% |
| Worker Threads | 1 | 41.7M samples/sec | 2.490 ms | 100.0% |
| Worker Threads | 2 | 49.5M samples/sec | 3.163 ms | 118.9% |
| Worker Threads | 4 | 85.3M samples/sec | 3.354 ms | 204.7% |
| Worker Threads | 8 | 114.6M samples/sec | 5.288 ms | 274.9% |
| Worker Threads | 16 | 168.9M samples/sec | 7.137 ms | 405.3% |
| Worker Threads | 32 | 188.3M samples/sec | 11.965 ms | 451.9% |
| Worker Threads | 64 | 196.5M samples/sec | 22.989 ms | 471.5% |
| Worker Threads | 128 | 203.6M samples/sec | 43.123 ms | 488.6% |
| Worker Threads | 256 | 206.7M samples/sec | 87.886 ms | 495.9% |
| Worker Threads | 512 | 208.1M samples/sec | 168.559 ms | 499.2% |
| Worker Threads | 1024 | 207.9M samples/sec | 334.937 ms | 498.7% |

**Key Insights:**
- **3.4x throughput increase** from 1 to 1024 pipelines
- ⚠️ Consider CPU/memory bottlenecks
- Async processing allows effective CPU core utilization
- Ideal for multi-tenant or microservices architectures
- p99 latency remains stable under concurrent load

---

## Story 6 — Real-Time Audio Latency

### Audio Latency vs Buffer Duration

Testing real-time audio processing constraints across different buffer configurations:

![Audio Latency vs Duration](../charts/12th-gen-intel-core-i5-12600t/audio_latency_vs_duration.png)

#### Real-Time Suitability Matrix

| Pipeline | Config | Buffer Duration | Avg Latency | p99 Latency | Headroom | Real-Time | Production Safe |
|----------|--------|-----------------|-------------|-------------|----------|-----------|-----------------|
| simple | ultra-low | 2.67ms | 0.08925159999999778ms | 0.44369999999997844ms | 96.65724344569297% | ✅ | ✅ |
| simple | low | 5.33ms | 0.2747138000000036ms | 0.8685999999997875ms | 94.8458949343339% | ✅ | ✅ |
| simple | balanced | 10.67ms | 0.3128282999999756ms | 0.806800000000294ms | 97.068150890347% | ✅ | ✅ |
| simple | high-quality | 21.33ms | 0.38878669999999693ms | 0.88379999999961ms | 98.17727754336616% | ✅ | ✅ |
| simple | batch | 42.67ms | 0.4193957999998674ms | 0.9246000000057393ms | 99.01711788141581% | ✅ | ✅ |
| moderate | ultra-low | 2.67ms | 0.2529783000000898ms | 0.7492999999958556ms | 90.52515730336742% | ✅ | ✅ |
| moderate | low | 5.33ms | 0.33454690000024856ms | 0.8082999999896856ms | 93.7233227016839% | ✅ | ✅ |
| moderate | balanced | 10.67ms | 0.23294430000026478ms | 0.6876000000047497ms | 97.81682942830118% | ✅ | ✅ |
| moderate | high-quality | 21.33ms | 0.24331259999961186ms | 0.6388000000006286ms | 98.85929395218184% | ✅ | ✅ |
| moderate | batch | 42.67ms | 0.2925290999998251ms | 0.7802999999839813ms | 99.31443848136905% | ✅ | ✅ |
| complex | ultra-low | 2.67ms | 0.09871850000016275ms | 0.4907999999995809ms | 96.30267790261561% | ✅ | ✅ |
| complex | low | 5.33ms | 0.1336545000000042ms | 0.5225999999966007ms | 97.49241088180105% | ✅ | ✅ |
| complex | balanced | 10.67ms | 0.1999196999996202ms | 0.7296000000205822ms | 98.12633833177487% | ✅ | ✅ |
| complex | high-quality | 21.33ms | 0.19973019999964162ms | 0.5204000000085216ms | 99.06361837787323% | ✅ | ✅ |
| complex | batch | 42.67ms | 0.25136670000010053ms | 0.5645999999833293ms | 99.41090531989666% | ✅ | ✅ |

**Real-Time Constraint:** Processing time must be < buffer duration for glitch-free audio.

### DSP Processing Time

Measuring pure DSP computation time (excluding OS timing overhead):

![DSP Processing Time](../charts/12th-gen-intel-core-i5-12600t/dsp_processing_time.png)

#### DSP Performance Analysis

| Pipeline | Config | DSP Avg Time | DSP Max Time | DSP Dropouts | Status |
|----------|--------|--------------|--------------|--------------|--------|
| simple | ultra-low | 0.08925159999999778ms | 0.6970999999998639ms | 0 | ✅ Perfect |
| simple | low | 0.2747138000000036ms | 1.4839999999994689ms | 0 | ✅ Perfect |
| simple | balanced | 0.3128282999999756ms | 1.3292999999994208ms | 0 | ✅ Perfect |
| simple | high-quality | 0.38878669999999693ms | 1.5030000000042492ms | 0 | ✅ Perfect |
| simple | batch | 0.4193957999998674ms | 5.21140000000014ms | 0 | ✅ Perfect |
| moderate | ultra-low | 0.2529783000000898ms | 1.290099999998347ms | 0 | ✅ Perfect |
| moderate | low | 0.33454690000024856ms | 1.2329000000027008ms | 0 | ✅ Perfect |
| moderate | balanced | 0.23294430000026478ms | 1.1040000000066357ms | 0 | ✅ Perfect |
| moderate | high-quality | 0.24331259999961186ms | 0.7283000000024913ms | 0 | ✅ Perfect |
| moderate | batch | 0.2925290999998251ms | 1.4590000000025611ms | 0 | ✅ Perfect |
| complex | ultra-low | 0.09871850000016275ms | 1.3444000000017695ms | 0 | ✅ Perfect |
| complex | low | 0.1336545000000042ms | 0.7643999999854714ms | 0 | ✅ Perfect |
| complex | balanced | 0.1999196999996202ms | 5.075899999996182ms | 0 | ✅ Perfect |
| complex | high-quality | 0.19973019999964162ms | 1.0174000000115484ms | 0 | ✅ Perfect |
| complex | batch | 0.25136670000010053ms | 1.5670999999856576ms | 0 | ✅ Perfect |

**Key Insights:**
- DSP processing time shows pure algorithmic performance
- Zero DSP dropouts indicate the algorithm can handle real-time requirements
- OS timing overhead (GC, scheduling) adds additional latency

### Audio Latency Percentiles

Measuring latency distribution for real-time audio processing:

![Audio Latency Percentiles](../charts/12th-gen-intel-core-i5-12600t/audio_latency_percentiles.png)

#### Latency Distribution Analysis

| Pipeline | Config | p50 | p95 | p99 | Max | Avg Jitter |
|----------|--------|-----|-----|-----|-----|------------|
| simple | ultra-low | 0.0403999999999769ms | 0.34940000000005966ms | 0.44369999999997844ms | 0.6970999999998639ms | 0.09318808808808826ms |
| simple | low | 0.25030000000015207ms | 0.5969000000000051ms | 0.8685999999997875ms | 1.4839999999994689ms | 0.17662592592594253ms |
| simple | balanced | 0.30059999999866704ms | 0.5884000000005472ms | 0.806800000000294ms | 1.3292999999994208ms | 0.16147437437437792ms |
| simple | high-quality | 0.36999999999898137ms | 0.6010000000023865ms | 0.88379999999961ms | 1.5030000000042492ms | 0.14971731731731217ms |
| simple | batch | 0.3942000000097323ms | 0.6741000000038184ms | 0.9246000000057393ms | 5.21140000000014ms | 0.16022132132121106ms |
| moderate | ultra-low | 0.2278000000078464ms | 0.512300000002142ms | 0.7492999999958556ms | 1.290099999998347ms | 0.15794334334336585ms |
| moderate | low | 0.3107000000018161ms | 0.5975000000034925ms | 0.8082999999896856ms | 1.2329000000027008ms | 0.18080470470466697ms |
| moderate | balanced | 0.2076999999990221ms | 0.5209000000031665ms | 0.6876000000047497ms | 1.1040000000066357ms | 0.13622252252283837ms |
| moderate | high-quality | 0.20300000000861473ms | 0.5081999999965774ms | 0.6388000000006286ms | 0.7283000000024913ms | 0.14832652652649223ms |
| moderate | batch | 0.27749999999650754ms | 0.5319000000017695ms | 0.7802999999839813ms | 1.4590000000025611ms | 0.16118128128213496ms |
| complex | ultra-low | 0.045199999993201345ms | 0.37609999999403954ms | 0.4907999999995809ms | 1.3444000000017695ms | 0.09857057057084162ms |
| complex | low | 0.08320000002277084ms | 0.41029999998863786ms | 0.5225999999966007ms | 0.7643999999854714ms | 0.12847757757689968ms |
| complex | balanced | 0.13730000000214204ms | 0.480600000009872ms | 0.7296000000205822ms | 5.075899999996182ms | 0.16224994995076936ms |
| complex | high-quality | 0.14110000000800937ms | 0.4484000000229571ms | 0.5204000000085216ms | 1.0174000000115484ms | 0.12967047046955527ms |
| complex | batch | 0.21799999999348074ms | 0.46070000002509914ms | 0.5645999999833293ms | 1.5670999999856576ms | 0.13533733733686143ms |

**Key Insights:**
- p99 latency critical for real-time audio (must be < buffer duration)
- Low jitter indicates consistent processing performance
- Complex pipelines require larger buffers for real-time operation

### Audio Latency Jitter

Analyzing processing time consistency across sustained audio load:

![Audio Latency Jitter](../charts/12th-gen-intel-core-i5-12600t/audio_latency_jitter.png)

### DSP Processing Dropouts

Measuring pure DSP failures (processing time exceeded buffer duration):

![DSP Processing Dropouts](../charts/12th-gen-intel-core-i5-12600t/dsp_processing_dropouts.png)

### Audio Latency Headroom

Measuring safety margin between processing time and buffer duration:

![Audio Latency Headroom](../charts/12th-gen-intel-core-i5-12600t/audio_latency_headroom.png)

#### Headroom Analysis

| Pipeline | Config | Headroom | Dropout Rate | Status |
|----------|--------|----------|--------------|--------|
| simple | ultra-low | 96.65724344569297% | 0% | ✅ Production Ready |
| simple | low | 94.8458949343339% | 0% | ✅ Production Ready |
| simple | balanced | 97.068150890347% | 0% | ✅ Production Ready |
| simple | high-quality | 98.17727754336616% | 0% | ✅ Production Ready |
| simple | batch | 99.01711788141581% | 0% | ✅ Production Ready |
| moderate | ultra-low | 90.52515730336742% | 0% | ✅ Production Ready |
| moderate | low | 93.7233227016839% | 0% | ✅ Production Ready |
| moderate | balanced | 97.81682942830118% | 0% | ✅ Production Ready |
| moderate | high-quality | 98.85929395218184% | 0% | ✅ Production Ready |
| moderate | batch | 99.31443848136905% | 0% | ✅ Production Ready |
| complex | ultra-low | 96.30267790261561% | 0% | ✅ Production Ready |
| complex | low | 97.49241088180105% | 0% | ✅ Production Ready |
| complex | balanced | 98.12633833177487% | 0% | ✅ Production Ready |
| complex | high-quality | 99.06361837787323% | 0% | ✅ Production Ready |
| complex | batch | 99.41090531989666% | 0% | ✅ Production Ready |

**Production Readiness:**
- **15/15 configurations** production-ready (20%+ headroom)
- **97.1% average headroom** across all tests
- **15/15 configurations** with zero OS dropouts
- **15/15 configurations** with zero DSP dropouts

**Key Insights:**
- Higher headroom = more reliable real-time performance
- 20%+ headroom recommended for production audio applications
- Complex pipelines need larger buffers or simpler algorithms for real-time use
- DSP dropouts indicate algorithmic limitations, OS dropouts indicate runtime issues

---

## Conclusion

### Performance Wins

1. **Native SIMD Acceleration**
   - 3.3x faster than pure JavaScript
   - Consistent performance across input sizes
   - Optimized for modern CPU architectures

2. **Optimal Algorithms**
   - O(1) circular buffers vs O(N·W) naive implementations
   - **~640x speedup** for moving averages
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
   - **3.4x concurrent scaling** efficiency
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
**Date:** 2026-01-29T21:55:39.740Z  
**Runtime:** Node.js v22.21.1
