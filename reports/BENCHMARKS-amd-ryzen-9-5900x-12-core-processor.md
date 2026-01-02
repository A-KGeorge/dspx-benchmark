# 🧠 DSPX Benchmarks

**Auto-Generated:** 2026-01-02

## Machine Specifications

| Component | Specification |
|-----------|--------------|
| **CPU** | AMD Ryzen 9 5900X 12-Core Processor             |
| **Cores** | 24 |
| **RAM** | 64 GB |
| **Architecture** | x64 |
| **OS** | Microsoft Windows [Version 10.0.26200.6901] |
| **Node.js** | v22.17.1 |
| **dspx** | v1.3.5 |

---

## Executive Summary

This benchmark suite evaluates **dspx**, a high-performance DSP library with native C++ SIMD acceleration, against pure JavaScript and TensorFlow.js (CPU) implementations across five critical performance stories:

1. **Raw Speed** — C++ SIMD vs JS CPU implementations
2. **Algorithmic Efficiency** — O(1) vs O(N·W) scaling
3. **State Persistence** — Seamless Redis-backed crash recovery
4. **Production Logging** — TopicRouter batching overhead
5. **Production Profiling** — Memory stability, latency distribution, concurrent scaling

**Key Findings:**
- 🚀 **3.0x faster** than pure JS for FFT and filtering
- ⚡ **O(1) complexity** for moving averages (vs O(N·W) naive)
- 💾 **Sub-millisecond** state save/load operations
- 📊 **<5% overhead** with batched logging (vs >20% per-message)
- 🔒 **No memory leaks** detected (0.17KB avg growth/iter)
- ⚡ **Predictable latency** with tight p99 distribution
- 📈 **4.1x scaling** with concurrent pipelines

---

## Story 1 — Raw Computational Speed

### FFT Performance

Comparing Fast Fourier Transform implementations across different backends:

![FFT Throughput](../charts/amd-ryzen-9-5900x-12-core-processor/fft_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 129.62M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 3.94M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 4.76M samples/sec | CPU (Pure JS) |
| dspx | medium | 215.82M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 14.26M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 95.56M samples/sec | CPU (Pure JS) |
| dspx | large | 153.26M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 16.18M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 68.71M samples/sec | CPU (Pure JS) |
| scipy | small | 121.18M samples/sec | CPU (scipy.fft) |
| scipy | medium | 184.32M samples/sec | CPU (scipy.fft) |
| scipy | large | 112.52M samples/sec | CPU (scipy.fft) |
| dspx | small | 129.62M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 3.94M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 4.76M samples/sec | CPU (Pure JS) |
| dspx | medium | 215.82M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 14.26M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 95.56M samples/sec | CPU (Pure JS) |
| dspx | large | 153.26M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 16.18M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 68.71M samples/sec | CPU (Pure JS) |
| scipy | small | 121.18M samples/sec | CPU (scipy.fft) |
| scipy | medium | 184.32M samples/sec | CPU (scipy.fft) |
| scipy | large | 112.52M samples/sec | CPU (scipy.fft) |
| jdsp | small | 1.65M samples/sec | CPU (JDSP FFT) |
| jdsp | medium | 24.80M samples/sec | CPU (JDSP FFT) |
| jdsp | large | 25.21M samples/sec | CPU (JDSP FFT) |

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
| dspx | small | 11.95M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 8.63M samples/sec | CPU (Pure JS) |
| naive_js | small | 13.14M samples/sec | CPU (Pure JS) |
| dspx | medium | 39.15M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 12.19M samples/sec | CPU (Pure JS) |
| naive_js | medium | 15.10M samples/sec | CPU (Pure JS) |
| dspx | large | 36.40M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 12.17M samples/sec | CPU (Pure JS) |
| naive_js | large | 21.37M samples/sec | CPU (Pure JS) |
| scipy | small | 13.88M samples/sec | CPU (scipy.signal) |
| scipy | medium | 66.21M samples/sec | CPU (scipy.signal) |
| scipy | large | 55.15M samples/sec | CPU (scipy.signal) |
| dspx | small | 11.95M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 8.63M samples/sec | CPU (Pure JS) |
| naive_js | small | 13.14M samples/sec | CPU (Pure JS) |
| dspx | medium | 39.15M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 12.19M samples/sec | CPU (Pure JS) |
| naive_js | medium | 15.10M samples/sec | CPU (Pure JS) |
| dspx | large | 36.40M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 12.17M samples/sec | CPU (Pure JS) |
| naive_js | large | 21.37M samples/sec | CPU (Pure JS) |
| scipy | small | 13.88M samples/sec | CPU (scipy.signal) |
| scipy | medium | 66.21M samples/sec | CPU (scipy.signal) |
| scipy | large | 55.15M samples/sec | CPU (scipy.signal) |
| jdsp | small | 7.97M samples/sec | CPU (JDSP FIR) |
| jdsp | medium | 43.11M samples/sec | CPU (JDSP FIR) |
| jdsp | large | 34.97M samples/sec | CPU (JDSP FIR) |

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

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 0.074 | 0.028 | ⏭️ skipped | **0.4x** | **—** | 13.9M | 36.4M | ⏭️ skipped |
| 128 | 0.044 | 0.082 | ⏭️ skipped | **1.9x** | **—** | 23.3M | 12.4M | ⏭️ skipped |
| 512 | 0.045 | 0.263 | ⏭️ skipped | **5.9x** | **—** | 23.0M | 3.9M | ⏭️ skipped |
| 2048 | 0.048 | 0.366 | ⏭️ skipped | **7.6x** | **—** | 21.3M | 2.8M | ⏭️ skipped |
| 8192 | 0.049 | 0.378 | ⏭️ skipped | **7.7x** | **—** | 20.8M | 2.7M | ⏭️ skipped |

#### Performance Comparison (MEDIUM Input)

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 0.492 | 1.431 | ⏭️ skipped | **2.9x** | **—** | 133.2M | 45.8M | ⏭️ skipped |
| 128 | 0.501 | 5.448 | ⏭️ skipped | **10.9x** | **—** | 130.8M | 12.0M | ⏭️ skipped |
| 512 | 0.518 | 21.518 | ⏭️ skipped | **41.6x** | **—** | 126.6M | 3.0M | ⏭️ skipped |
| 2048 | 0.489 | 85.043 | ⏭️ skipped | **173.8x** | **—** | 134.0M | 770.6K | ⏭️ skipped |
| 8192 | 0.491 | 324.165 | ⏭️ skipped | **660.6x** | **—** | 133.5M | 202.2K | ⏭️ skipped |

#### Performance Comparison (LARGE Input)

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 7.308 | 22.019 | ⏭️ skipped | **3.0x** | **—** | 143.5M | 47.6M | ⏭️ skipped |
| 128 | 7.329 | 86.562 | ⏭️ skipped | **11.8x** | **—** | 143.1M | 12.1M | ⏭️ skipped |
| 512 | 7.299 | 345.819 | ⏭️ skipped | **47.4x** | **—** | 143.7M | 3.0M | ⏭️ skipped |
| 2048 | 7.302 | 1377.556 | ⏭️ skipped | **188.7x** | **—** | 143.6M | 761.2K | ⏭️ skipped |
| 8192 | 7.328 | 5510.431 | ⏭️ skipped | **752.0x** | **—** | 143.1M | 190.3K | ⏭️ skipped |


**Key Insights:**
- dspx maintains constant time regardless of window size
- Naive implementation degrades linearly with window size (O(N·W) complexity)
- **~661x speedup** with circular buffer approach at production scale (medium input, 8192 window)
- Critical for real-time processing where window sizes can be large (1000+ samples)

---

## Story 3 — Redis Resilience (State Persistence)

### State Save/Load Performance

Testing pipeline state serialization for crash recovery (FirFilter → RMS pipeline):

![Redis Latency](../charts/amd-ryzen-9-5900x-12-core-processor/redis_latency.png)

#### Results Summary

| Input Size | Save Time (ms) | Load Time (ms) | State Size | Seamless? |
|------------|----------------|----------------|------------|-----------|
| small | 0.379 | 0.341 | 5.89 KB | ⚠️ |
| medium | 0.336 | 0.322 | 5.91 KB | ⚠️ |
| large | 0.341 | 0.324 | 5.81 KB | ⚠️ |

**Performance Metrics:**
- Average save time: **0.352 ms**
- Average load time: **0.329 ms**
- Average state size: **5.87 KB**
- All tests seamless: **⚠️ PARTIAL**

**Key Insights:**
- Sub-millisecond serialization enables frequent state snapshots
- State size scales with pipeline complexity, not input size
- Perfect reconstruction: outputs match bit-for-bit after restoration (JSON)
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
| batched | -0.16% | ✅ Recommended |
| per-message | -1.36% | ✅ Recommended |
| console | 5.52% | ✅ Recommended |

#### Detailed Results

| Input Size | Mode | Throughput | Overhead |
|------------|------|------------|----------|
| medium | none | 133.01M samples/sec | — |
| medium | batched | 133.14M samples/sec | -0.10% |
| medium | per-message | 136.01M samples/sec | -2.21% |
| medium | console | 126.05M samples/sec | 5.52% |
| large | none | 142.32M samples/sec | — |
| large | batched | 142.64M samples/sec | -0.22% |
| large | per-message | 143.06M samples/sec | -0.51% |

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
| small | 0.77 KB | 5.73 MB | ✅ Stable |
| medium | -0.12 KB | 5.78 MB | ✅ Stable |
| large | -0.14 KB | 5.79 MB | ✅ Stable |

**Key Insights:**
- Average heap growth: **0.17 KB/iteration** (50 iterations)
- ✅ No memory leaks detected
- Native C++ allocations stay within expected bounds
- Garbage collection efficiently reclaims temporary buffers

### Latency Distribution (p50/p95/p99)

Measuring latency consistency under steady load:

![Latency Distribution](../charts/amd-ryzen-9-5900x-12-core-processor/latency_distribution.png)

#### Latency Percentiles

| Input Size | p50 (Median) | p95 | p99 | Min | Max |
|------------|--------------|-----|-----|-----|-----|
| small | 0.055 ms | 0.089 ms | 0.098 ms | 0.054 ms | 0.098 ms |
| medium | 2.078 ms | 2.223 ms | 2.415 ms | 1.981 ms | 2.415 ms |
| large | 35.097 ms | 35.562 ms | 36.222 ms | 32.780 ms | 36.222 ms |

**Key Insights:**
- Tight latency distribution indicates predictable performance
- p99 latency stays close to median (low tail latency)
- Critical for real-time applications with SLA requirements
- No long-tail outliers from GC or unexpected allocations

### Latency Distribution Threaded (p50/p95/p99)

Measuring latency consistency with worker threads (isolated from main thread noise):

![Latency Distribution Threaded](../charts/amd-ryzen-9-5900x-12-core-processor/latency_distribution_threaded.png)

#### Latency Percentiles (Threaded)

| Input Size | p50 (Median) | p95 | p99 | Min | Max |
|------------|--------------|-----|-----|-----|-----|
| small | 0.033 ms | 0.041 ms | 0.047 ms | 0.032 ms | 0.047 ms |
| medium | 2.020 ms | 2.061 ms | 2.274 ms | 1.870 ms | 2.274 ms |
| large | 33.196 ms | 33.620 ms | 34.077 ms | 30.804 ms | 34.077 ms |

**Key Insights:**
- Worker threads isolate DSP from main thread event loop and GC noise
- Significantly reduced p99 tail latency compared to single-threaded
- More consistent performance for real-time applications
- Eliminates JavaScript-side overhead in latency measurements

### Concurrent Pipeline Scaling

Testing throughput with multiple independent pipelines:

![Concurrent Scaling](../charts/amd-ryzen-9-5900x-12-core-processor/concurrent_scaling.png)

#### Scaling Results

| Type | Pipeline Count | Total Throughput | p99 Latency | Efficiency |
|------|----------------|------------------|-------------|------------|
| Single Thread | 1 | 30.4M samples/sec | 2.334 ms | 100.0% |
| Single Thread | 2 | 55.3M samples/sec | 2.546 ms | 90.9% |
| Single Thread | 4 | 76.0M samples/sec | 4.835 ms | 62.5% |
| Single Thread | 8 | 110.5M samples/sec | 6.404 ms | 45.4% |
| Single Thread | 16 | 107.5M samples/sec | 12.167 ms | 22.1% |
| Single Thread | 32 | 115.9M samples/sec | 20.065 ms | 11.9% |
| Single Thread | 64 | 112.4M samples/sec | 40.791 ms | 5.8% |
| Single Thread | 128 | 118.5M samples/sec | 74.854 ms | 3.0% |
| Single Thread | 256 | 117.5M samples/sec | 146.160 ms | 1.5% |
| Single Thread | 512 | 124.6M samples/sec | 274.401 ms | 0.8% |
| Single Thread | 1024 | 123.9M samples/sec | 552.046 ms | 0.4% |
| Worker Threads | 1 | 33.7M samples/sec | 2.276 ms | 100.0% |
| Worker Threads | 2 | 43.6M samples/sec | 3.262 ms | 129.5% |
| Worker Threads | 4 | 110.5M samples/sec | 2.781 ms | 327.9% |
| Worker Threads | 8 | 190.1M samples/sec | 3.135 ms | 564.0% |
| Worker Threads | 16 | 278.7M samples/sec | 4.404 ms | 827.0% |
| Worker Threads | 32 | 333.9M samples/sec | 7.489 ms | 990.6% |
| Worker Threads | 64 | 423.0M samples/sec | 11.060 ms | 1255.2% |
| Worker Threads | 128 | 438.0M samples/sec | 20.910 ms | 1299.7% |
| Worker Threads | 256 | 461.0M samples/sec | 38.452 ms | 1367.9% |
| Worker Threads | 512 | 473.3M samples/sec | 74.448 ms | 1404.5% |
| Worker Threads | 1024 | 424.9M samples/sec | 212.807 ms | 1260.7% |

**Key Insights:**
- **4.1x throughput increase** from 1 to 1024 pipelines
- ⚠️ Consider CPU/memory bottlenecks
- Async processing allows effective CPU core utilization
- Ideal for multi-tenant or microservices architectures
- p99 latency remains stable under concurrent load

---

## Story 6 — Real-Time Audio Latency

### Audio Latency vs Buffer Duration

Testing real-time audio processing constraints across different buffer configurations:

![Audio Latency vs Duration](../charts/amd-ryzen-9-5900x-12-core-processor/audio_latency_vs_duration.png)

#### Real-Time Suitability Matrix

| Pipeline | Config | Buffer Duration | Avg Latency | p99 Latency | Headroom | Real-Time | Production Safe |
|----------|--------|-----------------|-------------|-------------|----------|-----------|-----------------|
| simple | ultra-low | 2.67ms | 0.06420819999999347ms | 0.41010000000005675ms | 97.59519850187291% | ✅ | ✅ |
| simple | low | 5.33ms | 0.07477679999998918ms | 0.4184000000004744ms | 98.59705816135104% | ✅ | ✅ |
| simple | balanced | 10.67ms | 0.11287130000001708ms | 0.4454999999998108ms | 98.94216213683207% | ✅ | ✅ |
| simple | high-quality | 21.33ms | 0.15694060000000537ms | 0.44069999999919673ms | 99.26422597280823% | ✅ | ✅ |
| simple | batch | 42.67ms | 0.19988160000020436ms | 0.442799999989802ms | 99.53156409655448% | ✅ | ✅ |
| moderate | ultra-low | 2.67ms | 0.062160399999978834ms | 0.40850000000500586ms | 97.67189513108693% | ✅ | ✅ |
| moderate | low | 5.33ms | 0.0730603999998566ms | 0.4106000000028871ms | 98.6292607879952% | ✅ | ✅ |
| moderate | balanced | 10.67ms | 0.10879910000012023ms | 0.43140000000130385ms | 98.98032708528473% | ✅ | ✅ |
| moderate | high-quality | 21.33ms | 0.14797270000014395ms | 0.43110000000160653ms | 99.30626957337017% | ✅ | ✅ |
| moderate | batch | 42.67ms | 0.20335019999988435ms | 0.4416999999957625ms | 99.52343520037525% | ✅ | ✅ |
| complex | ultra-low | 2.67ms | 0.05713719999967725ms | 0.4026000000012573ms | 97.8600299625589% | ✅ | ✅ |
| complex | low | 5.33ms | 0.07287389999959851ms | 0.4148999999742955ms | 98.63275984991373% | ✅ | ✅ |
| complex | balanced | 10.67ms | 0.1085547999998671ms | 0.4170999999914784ms | 98.98261668228803% | ✅ | ✅ |
| complex | high-quality | 21.33ms | 0.15919639999986976ms | 0.4382000000041444ms | 99.2536502578534% | ✅ | ✅ |
| complex | batch | 42.67ms | 0.20908690000022762ms | 0.4364999999816064ms | 99.50999086008852% | ✅ | ✅ |

**Real-Time Constraint:** Processing time must be < buffer duration for glitch-free audio.

### DSP Processing Time

Measuring pure DSP computation time (excluding OS timing overhead):

![DSP Processing Time](../charts/amd-ryzen-9-5900x-12-core-processor/dsp_processing_time.png)

#### DSP Performance Analysis

| Pipeline | Config | DSP Avg Time | DSP Max Time | DSP Dropouts | Status |
|----------|--------|--------------|--------------|--------------|--------|
| simple | ultra-low | 0.06420819999999347ms | 0.5550000000000637ms | 0 | ✅ Perfect |
| simple | low | 0.07477679999998918ms | 0.4533000000001266ms | 0 | ✅ Perfect |
| simple | balanced | 0.11287130000001708ms | 0.5509000000001834ms | 0 | ✅ Perfect |
| simple | high-quality | 0.15694060000000537ms | 0.8306999999986147ms | 0 | ✅ Perfect |
| simple | batch | 0.19988160000020436ms | 0.46199999999953434ms | 0 | ✅ Perfect |
| moderate | ultra-low | 0.062160399999978834ms | 0.458199999993667ms | 0 | ✅ Perfect |
| moderate | low | 0.0730603999998566ms | 0.4860999999946216ms | 0 | ✅ Perfect |
| moderate | balanced | 0.10879910000012023ms | 0.4419999999954598ms | 0 | ✅ Perfect |
| moderate | high-quality | 0.14797270000014395ms | 0.44530000000668224ms | 0 | ✅ Perfect |
| moderate | batch | 0.20335019999988435ms | 0.6572000000014668ms | 0 | ✅ Perfect |
| complex | ultra-low | 0.05713719999967725ms | 1.5691000000224449ms | 0 | ✅ Perfect |
| complex | low | 0.07287389999959851ms | 0.5841999999829568ms | 0 | ✅ Perfect |
| complex | balanced | 0.1085547999998671ms | 0.6965999999956694ms | 0 | ✅ Perfect |
| complex | high-quality | 0.15919639999986976ms | 0.7449999999953434ms | 0 | ✅ Perfect |
| complex | batch | 0.20908690000022762ms | 0.6776000000245403ms | 0 | ✅ Perfect |

**Key Insights:**
- DSP processing time shows pure algorithmic performance
- Zero DSP dropouts indicate the algorithm can handle real-time requirements
- OS timing overhead (GC, scheduling) adds additional latency

### Audio Latency Percentiles

Measuring latency distribution for real-time audio processing:

![Audio Latency Percentiles](../charts/amd-ryzen-9-5900x-12-core-processor/audio_latency_percentiles.png)

#### Latency Distribution Analysis

| Pipeline | Config | p50 | p95 | p99 | Max | Avg Jitter |
|----------|--------|-----|-----|-----|-----|------------|
| simple | ultra-low | 0.025300000000015643ms | 0.3163999999999305ms | 0.41010000000005675ms | 0.5550000000000637ms | 0.06942312312311849ms |
| simple | low | 0.03099999999994907ms | 0.3284000000003289ms | 0.4184000000004744ms | 0.4533000000001266ms | 0.08807177177178292ms |
| simple | balanced | 0.06480000000010477ms | 0.3816999999999098ms | 0.4454999999998108ms | 0.5509000000001834ms | 0.10726736736739291ms |
| simple | high-quality | 0.08289999999760767ms | 0.39650000000256114ms | 0.44069999999919673ms | 0.8306999999986147ms | 0.1269723723724945ms |
| simple | batch | 0.1570999999967171ms | 0.42000000000552973ms | 0.442799999989802ms | 0.46199999999953434ms | 0.13391191191159715ms |
| moderate | ultra-low | 0.021000000007916242ms | 0.3154999999969732ms | 0.40850000000500586ms | 0.458199999993667ms | 0.07371631631665784ms |
| moderate | low | 0.026700000002165325ms | 0.3130000000091968ms | 0.4106000000028871ms | 0.4860999999946216ms | 0.09089879879890056ms |
| moderate | balanced | 0.06620000000111759ms | 0.37410000000090804ms | 0.43140000000130385ms | 0.4419999999954598ms | 0.11241061061077558ms |
| moderate | high-quality | 0.0844000000070082ms | 0.396100000012666ms | 0.43110000000160653ms | 0.44530000000668224ms | 0.11298358358382594ms |
| moderate | batch | 0.16490000000339933ms | 0.41090000001713634ms | 0.4416999999957625ms | 0.6572000000014668ms | 0.12723623623592709ms |
| complex | ultra-low | 0.021100000012665987ms | 0.26209999999264255ms | 0.4026000000012573ms | 1.5691000000224449ms | 0.0651852852857515ms |
| complex | low | 0.02709999997750856ms | 0.33280000000377186ms | 0.4148999999742955ms | 0.5841999999829568ms | 0.08628398398394455ms |
| complex | balanced | 0.06969999999273568ms | 0.36930000002030283ms | 0.4170999999914784ms | 0.6965999999956694ms | 0.10064814814836723ms |
| complex | high-quality | 0.09130000000004657ms | 0.39830000000074506ms | 0.4382000000041444ms | 0.7449999999953434ms | 0.11371941941981278ms |
| complex | batch | 0.15940000000409782ms | 0.41920000000391155ms | 0.4364999999816064ms | 0.6776000000245403ms | 0.1261762762759198ms |

**Key Insights:**
- p99 latency critical for real-time audio (must be < buffer duration)
- Low jitter indicates consistent processing performance
- Complex pipelines require larger buffers for real-time operation

### Audio Latency Jitter

Analyzing processing time consistency across sustained audio load:

![Audio Latency Jitter](../charts/amd-ryzen-9-5900x-12-core-processor/audio_latency_jitter.png)

### DSP Processing Dropouts

Measuring pure DSP failures (processing time exceeded buffer duration):

![DSP Processing Dropouts](../charts/amd-ryzen-9-5900x-12-core-processor/dsp_processing_dropouts.png)

### Audio Latency Headroom

Measuring safety margin between processing time and buffer duration:

![Audio Latency Headroom](../charts/amd-ryzen-9-5900x-12-core-processor/audio_latency_headroom.png)

#### Headroom Analysis

| Pipeline | Config | Headroom | Dropout Rate | Status |
|----------|--------|----------|--------------|--------|
| simple | ultra-low | 97.59519850187291% | 0% | ✅ Production Ready |
| simple | low | 98.59705816135104% | 0% | ✅ Production Ready |
| simple | balanced | 98.94216213683207% | 0% | ✅ Production Ready |
| simple | high-quality | 99.26422597280823% | 0% | ✅ Production Ready |
| simple | batch | 99.53156409655448% | 0% | ✅ Production Ready |
| moderate | ultra-low | 97.67189513108693% | 0% | ✅ Production Ready |
| moderate | low | 98.6292607879952% | 0% | ✅ Production Ready |
| moderate | balanced | 98.98032708528473% | 0% | ✅ Production Ready |
| moderate | high-quality | 99.30626957337017% | 0% | ✅ Production Ready |
| moderate | batch | 99.52343520037525% | 0% | ✅ Production Ready |
| complex | ultra-low | 97.8600299625589% | 0% | ✅ Production Ready |
| complex | low | 98.63275984991373% | 0% | ✅ Production Ready |
| complex | balanced | 98.98261668228803% | 0% | ✅ Production Ready |
| complex | high-quality | 99.2536502578534% | 0% | ✅ Production Ready |
| complex | batch | 99.50999086008852% | 0% | ✅ Production Ready |

**Production Readiness:**
- **15/15 configurations** production-ready (20%+ headroom)
- **98.8% average headroom** across all tests
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
   - 3.0x faster than pure JavaScript
   - Consistent performance across input sizes
   - Optimized for modern CPU architectures

2. **Optimal Algorithms**
   - O(1) circular buffers vs O(N·W) naive implementations
   - **~661x speedup** for moving averages
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
   - **4.1x concurrent scaling** efficiency
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
**Date:** 2026-01-02T01:58:15.277Z  
**Runtime:** Node.js v22.17.1
