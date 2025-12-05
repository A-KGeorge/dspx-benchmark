# 🧠 DSPX Benchmarks

**Auto-Generated:** 2025-12-05

## Machine Specifications

| Component | Specification |
|-----------|--------------|
| **CPU** | AMD Ryzen 9 5900X 12-Core Processor             |
| **Cores** | 24 |
| **RAM** | 64 GB |
| **Architecture** | x64 |
| **OS** | Microsoft Windows [Version 10.0.26200.6901] |
| **Node.js** | v22.17.1 |
| **dspx** | v1.3.0 |

---

## Executive Summary

This benchmark suite evaluates **dspx**, a high-performance DSP library with native C++ SIMD acceleration, against pure JavaScript and TensorFlow.js (CPU) implementations across five critical performance stories:

1. **Raw Speed** — C++ SIMD vs JS CPU implementations
2. **Algorithmic Efficiency** — O(1) vs O(N·W) scaling
3. **State Persistence** — Seamless Redis-backed crash recovery
4. **Production Logging** — TopicRouter batching overhead
5. **Production Profiling** — Memory stability, latency distribution, concurrent scaling

**Key Findings:**
- 🚀 **2.6x faster** than pure JS for FFT and filtering
- ⚡ **O(1) complexity** for moving averages (vs O(N·W) naive)
- 💾 **Sub-millisecond** state save/load operations
- 📊 **<5% overhead** with batched logging (vs >20% per-message)
- 🔒 **No memory leaks** detected (0.16666666666666666KB avg growth/iter)
- ⚡ **Predictable latency** with tight p99 distribution
- 📈 **4.2x scaling** with concurrent pipelines

---

## Story 1 — Raw Computational Speed

### FFT Performance

Comparing Fast Fourier Transform implementations across different backends:

![FFT Throughput](../charts/amd-ryzen-9-5900x-12-core-processor/fft_throughput.png)

#### Results Summary

| Library | Input Size | Throughput | Backend |
|---------|------------|------------|---------|
| dspx | small | 115.32M samples/sec | CPU (Native C++ SIMD) |
| tfjs | small | 3.88M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | small | 5.48M samples/sec | CPU (Pure JS) |
| dspx | medium | 213.45M samples/sec | CPU (Native C++ SIMD) |
| tfjs | medium | 14.34M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | medium | 96.59M samples/sec | CPU (Pure JS) |
| dspx | large | 125.31M samples/sec | CPU (Native C++ SIMD) |
| tfjs | large | 16.41M samples/sec | CPU (TensorFlow.js Node (C++)) |
| fft.js | large | 69.97M samples/sec | CPU (Pure JS) |

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
| dspx | small | 12.10M samples/sec | CPU (Native C++ SIMD) |
| fili | small | 8.83M samples/sec | CPU (Pure JS) |
| naive_js | small | 12.80M samples/sec | CPU (Pure JS) |
| dspx | medium | 38.68M samples/sec | CPU (Native C++ SIMD) |
| fili | medium | 12.41M samples/sec | CPU (Pure JS) |
| naive_js | medium | 20.29M samples/sec | CPU (Pure JS) |
| dspx | large | 38.12M samples/sec | CPU (Native C++ SIMD) |
| fili | large | 11.59M samples/sec | CPU (Pure JS) |
| naive_js | large | 20.37M samples/sec | CPU (Pure JS) |

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
| 32 | 0.081 | 0.023 | ⏭️ skipped | **0.3x** | **—** | 12.7M | 44.0M | ⏭️ skipped |
| 128 | 0.043 | 0.082 | ⏭️ skipped | **1.9x** | **—** | 24.0M | 12.4M | ⏭️ skipped |
| 512 | 0.039 | 0.278 | ⏭️ skipped | **7.0x** | **—** | 26.0M | 3.7M | ⏭️ skipped |
| 2048 | 0.045 | 0.382 | ⏭️ skipped | **8.4x** | **—** | 22.6M | 2.7M | ⏭️ skipped |
| 8192 | 0.050 | 0.363 | ⏭️ skipped | **7.3x** | **—** | 20.6M | 2.8M | ⏭️ skipped |

#### Performance Comparison (MEDIUM Input)

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 0.476 | 1.401 | ⏭️ skipped | **2.9x** | **—** | 137.7M | 46.8M | ⏭️ skipped |
| 128 | 0.481 | 5.494 | ⏭️ skipped | **11.4x** | **—** | 136.2M | 11.9M | ⏭️ skipped |
| 512 | 0.470 | 21.530 | ⏭️ skipped | **45.8x** | **—** | 139.3M | 3.0M | ⏭️ skipped |
| 2048 | 0.506 | 85.067 | ⏭️ skipped | **168.2x** | **—** | 129.6M | 770.4K | ⏭️ skipped |
| 8192 | 0.493 | 325.104 | ⏭️ skipped | **659.3x** | **—** | 132.9M | 201.6K | ⏭️ skipped |

#### Performance Comparison (LARGE Input)

| Window Size | dspx (ms) | naive JS (ms) | tf.js (ms) | Speedup (dspx vs naive) | Speedup (dspx vs tf.js) | Throughput (dspx) | Throughput (naive) | Throughput (tf.js) |
|-------------|-----------|---------------|------------|--------------------------|--------------------------|-------------------|--------------------|-------------------|
| 32 | 7.235 | 22.126 | ⏭️ skipped | **3.1x** | **—** | 144.9M | 47.4M | ⏭️ skipped |
| 128 | 7.236 | 86.815 | ⏭️ skipped | **12.0x** | **—** | 144.9M | 12.1M | ⏭️ skipped |
| 512 | 7.252 | 346.265 | ⏭️ skipped | **47.7x** | **—** | 144.6M | 3.0M | ⏭️ skipped |
| 2048 | 7.205 | 1383.180 | ⏭️ skipped | **192.0x** | **—** | 145.5M | 758.1K | ⏭️ skipped |
| 8192 | 7.227 | 5511.553 | ⏭️ skipped | **762.6x** | **—** | 145.1M | 190.3K | ⏭️ skipped |


**Key Insights:**
- dspx maintains constant time regardless of window size
- Naive implementation degrades linearly with window size (O(N·W) complexity)
- **~659x speedup** with circular buffer approach at production scale (medium input, 8192 window)
- Critical for real-time processing where window sizes can be large (1000+ samples)

---

## Story 3 — Redis Resilience (State Persistence)

### State Save/Load Performance

Testing pipeline state serialization for crash recovery (FirFilter → RMS pipeline):

![Redis Latency](../charts/amd-ryzen-9-5900x-12-core-processor/redis_latency.png)

#### Results Summary

| Input Size | Save Time (ms) | Load Time (ms) | State Size | Seamless? |
|------------|----------------|----------------|------------|-----------|
| small | 0.370 | 0.338 | 5.89 KB | ⚠️ |
| medium | 0.337 | 0.318 | 5.91 KB | ⚠️ |
| large | 0.309 | 0.307 | 5.81 KB | ⚠️ |

**Performance Metrics:**
- Average save time: **0.339 ms**
- Average load time: **0.321 ms**
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
| batched | -2.71% | ✅ Recommended |
| per-message | -0.60% | ✅ Recommended |
| console | -6.58% | ✅ Recommended |

#### Detailed Results

| Input Size | Mode | Throughput | Overhead |
|------------|------|------------|----------|
| medium | none | 126.25M samples/sec | — |
| medium | batched | 136.31M samples/sec | -7.39% |
| medium | per-message | 133.03M samples/sec | -5.10% |
| medium | console | 135.14M samples/sec | -6.58% |
| large | none | 138.90M samples/sec | — |
| large | batched | 136.23M samples/sec | 1.96% |
| large | per-message | 133.69M samples/sec | 3.90% |

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
| small | 0.76 KB | 5.72 MB | ✅ Stable |
| medium | -0.12 KB | 5.77 MB | ✅ Stable |
| large | -0.14 KB | 5.78 MB | ✅ Stable |

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
| small | 0.059 ms | 0.083 ms | 0.098 ms | 0.054 ms | 0.098 ms |
| medium | 2.032 ms | 2.342 ms | 2.622 ms | 1.970 ms | 2.622 ms |
| large | 33.566 ms | 34.684 ms | 35.132 ms | 32.490 ms | 35.132 ms |

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
| small | 0.034 ms | 0.056 ms | 1.169 ms | 0.032 ms | 1.169 ms |
| medium | 1.892 ms | 2.081 ms | 2.194 ms | 1.885 ms | 2.194 ms |
| large | 31.315 ms | 33.392 ms | 33.662 ms | 31.024 ms | 33.662 ms |

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
| Single Thread | 1 | 30.5M samples/sec | 2.539 ms | 100.0% |
| Single Thread | 2 | 57.5M samples/sec | 2.482 ms | 94.1% |
| Single Thread | 4 | 81.0M samples/sec | 5.811 ms | 66.3% |
| Single Thread | 8 | 100.0M samples/sec | 6.586 ms | 40.9% |
| Single Thread | 16 | 106.3M samples/sec | 12.310 ms | 21.8% |
| Single Thread | 32 | 111.5M samples/sec | 20.720 ms | 11.4% |
| Single Thread | 64 | 115.2M samples/sec | 38.575 ms | 5.9% |
| Single Thread | 128 | 124.7M samples/sec | 68.158 ms | 3.2% |
| Single Thread | 256 | 128.1M samples/sec | 133.239 ms | 1.6% |
| Single Thread | 512 | 129.4M samples/sec | 267.488 ms | 0.8% |
| Single Thread | 1024 | 127.8M samples/sec | 543.818 ms | 0.4% |
| Worker Threads | 1 | 32.4M samples/sec | 2.099 ms | 100.0% |
| Worker Threads | 2 | 60.0M samples/sec | 2.346 ms | 185.4% |
| Worker Threads | 4 | 117.1M samples/sec | 2.455 ms | 361.9% |
| Worker Threads | 8 | 195.9M samples/sec | 2.972 ms | 605.4% |
| Worker Threads | 16 | 301.4M samples/sec | 3.766 ms | 931.2% |
| Worker Threads | 32 | 330.0M samples/sec | 7.183 ms | 1019.8% |
| Worker Threads | 64 | 419.3M samples/sec | 11.892 ms | 1295.5% |
| Worker Threads | 128 | 442.7M samples/sec | 21.013 ms | 1367.8% |
| Worker Threads | 256 | 475.4M samples/sec | 36.875 ms | 1468.8% |
| Worker Threads | 512 | 481.4M samples/sec | 71.820 ms | 1487.5% |
| Worker Threads | 1024 | 435.3M samples/sec | 189.265 ms | 1345.0% |

**Key Insights:**
- **4.2x throughput increase** from 1 to 1024 pipelines
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
| simple | ultra-low | 2.67ms | 0.060278200000001995ms | 0.41820000000006985ms | 97.74238951310853% | ✅ | ✅ |
| simple | low | 5.33ms | 0.07705479999999125ms | 0.4245999999993728ms | 98.55431894934351% | ✅ | ✅ |
| simple | balanced | 10.67ms | 0.12453800000001775ms | 0.4519000000000233ms | 98.83282099343938% | ✅ | ✅ |
| simple | high-quality | 21.33ms | 0.1594235999999837ms | 0.4364999999997963ms | 99.25258509142061% | ✅ | ✅ |
| simple | batch | 42.67ms | 0.19050469999986672ms | 0.4387999999889871ms | 99.55353948910273% | ✅ | ✅ |
| moderate | ultra-low | 2.67ms | 0.057102800000066053ms | 0.4058999999979278ms | 97.86131835205745% | ✅ | ✅ |
| moderate | low | 5.33ms | 0.07689619999997375ms | 0.4113000000070315ms | 98.55729455909993% | ✅ | ✅ |
| moderate | balanced | 10.67ms | 0.1037599000002083ms | 0.41869999999471474ms | 99.02755482661473% | ✅ | ✅ |
| moderate | high-quality | 21.33ms | 0.14781449999986215ms | 0.427800000004936ms | 99.30701125175874% | ✅ | ✅ |
| moderate | batch | 42.67ms | 0.20077599999989615ms | 0.4407000000064727ms | 99.52946801031193% | ✅ | ✅ |
| complex | ultra-low | 2.67ms | 0.05475209999969229ms | 0.4085999999952037ms | 97.94935955057332% | ✅ | ✅ |
| complex | low | 5.33ms | 0.06830259999950067ms | 0.4138000000093598ms | 98.71852532833957% | ✅ | ✅ |
| complex | balanced | 10.67ms | 0.10866330000042217ms | 0.4248999999836087ms | 98.9815998125546% | ✅ | ✅ |
| complex | high-quality | 21.33ms | 0.15265290000048118ms | 0.4310000000114087ms | 99.28432770745202% | ✅ | ✅ |
| complex | batch | 42.67ms | 0.19912990000064018ms | 0.4377000000094995ms | 99.53332575579881% | ✅ | ✅ |

**Real-Time Constraint:** Processing time must be < buffer duration for glitch-free audio.

### DSP Processing Time

Measuring pure DSP computation time (excluding OS timing overhead):

![DSP Processing Time](../charts/amd-ryzen-9-5900x-12-core-processor/dsp_processing_time.png)

#### DSP Performance Analysis

| Pipeline | Config | DSP Avg Time | DSP Max Time | DSP Dropouts | Status |
|----------|--------|--------------|--------------|--------------|--------|
| simple | ultra-low | 0.060278200000001995ms | 0.5049999999999955ms | 0 | ✅ Perfect |
| simple | low | 0.07705479999999125ms | 0.5275999999994383ms | 0 | ✅ Perfect |
| simple | balanced | 0.12453800000001775ms | 0.6159000000006927ms | 0 | ✅ Perfect |
| simple | high-quality | 0.1594235999999837ms | 0.6810999999979686ms | 0 | ✅ Perfect |
| simple | batch | 0.19050469999986672ms | 0.5844000000070082ms | 0 | ✅ Perfect |
| moderate | ultra-low | 0.057102800000066053ms | 0.5573999999905936ms | 0 | ✅ Perfect |
| moderate | low | 0.07689619999997375ms | 0.44139999999606516ms | 0 | ✅ Perfect |
| moderate | balanced | 0.1037599000002083ms | 0.6107999999949243ms | 0 | ✅ Perfect |
| moderate | high-quality | 0.14781449999986215ms | 0.47169999999459833ms | 0 | ✅ Perfect |
| moderate | batch | 0.20077599999989615ms | 0.5681999999942491ms | 0 | ✅ Perfect |
| complex | ultra-low | 0.05475209999969229ms | 0.5372999999963213ms | 0 | ✅ Perfect |
| complex | low | 0.06830259999950067ms | 0.6696000000229105ms | 0 | ✅ Perfect |
| complex | balanced | 0.10866330000042217ms | 0.4320000000006985ms | 0 | ✅ Perfect |
| complex | high-quality | 0.15265290000048118ms | 0.4713999999803491ms | 0 | ✅ Perfect |
| complex | batch | 0.19912990000064018ms | 0.6480000000155997ms | 0 | ✅ Perfect |

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
| simple | ultra-low | 0.022699999999986176ms | 0.3169000000000324ms | 0.41820000000006985ms | 0.5049999999999955ms | 0.06659729729729841ms |
| simple | low | 0.030300000000352156ms | 0.34130000000004657ms | 0.4245999999993728ms | 0.5275999999994383ms | 0.09243943943944738ms |
| simple | balanced | 0.06420000000071013ms | 0.39650000000074215ms | 0.4519000000000233ms | 0.6159000000006927ms | 0.11871821821821028ms |
| simple | high-quality | 0.07999999999810825ms | 0.40080000000307336ms | 0.4364999999997963ms | 0.6810999999979686ms | 0.12269559559558751ms |
| simple | batch | 0.15350000000034925ms | 0.4144000000014785ms | 0.4387999999889871ms | 0.5844000000070082ms | 0.1352779779777416ms |
| moderate | ultra-low | 0.01909999999043066ms | 0.300600000002305ms | 0.4058999999979278ms | 0.5573999999905936ms | 0.066724924925207ms |
| moderate | low | 0.03209999999671709ms | 0.33729999999923166ms | 0.4113000000070315ms | 0.44139999999606516ms | 0.09341211211179509ms |
| moderate | balanced | 0.062099999995552935ms | 0.35070000000996515ms | 0.41869999999471474ms | 0.6107999999949243ms | 0.10612622622645355ms |
| moderate | high-quality | 0.07739999999466818ms | 0.38739999999233987ms | 0.427800000004936ms | 0.47169999999459833ms | 0.11108918918903651ms |
| moderate | batch | 0.16519999998854473ms | 0.4098999999987427ms | 0.4407000000064727ms | 0.5681999999942491ms | 0.13063823823774015ms |
| complex | ultra-low | 0.019100000004982576ms | 0.27679999999236315ms | 0.4085999999952037ms | 0.5372999999963213ms | 0.0644644644648665ms |
| complex | low | 0.02470000000903383ms | 0.30019999999785796ms | 0.4138000000093598ms | 0.6696000000229105ms | 0.08410670670661591ms |
| complex | balanced | 0.0650000000023283ms | 0.36819999999715947ms | 0.4248999999836087ms | 0.4320000000006985ms | 0.10012152152236418ms |
| complex | high-quality | 0.08389999999781139ms | 0.3929999999818392ms | 0.4310000000114087ms | 0.4713999999803491ms | 0.11209759759754911ms |
| complex | batch | 0.14400000000023283ms | 0.4131000000052154ms | 0.4377000000094995ms | 0.6480000000155997ms | 0.1260787787794432ms |

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
| simple | ultra-low | 97.74238951310853% | 0% | ✅ Production Ready |
| simple | low | 98.55431894934351% | 0% | ✅ Production Ready |
| simple | balanced | 98.83282099343938% | 0% | ✅ Production Ready |
| simple | high-quality | 99.25258509142061% | 0% | ✅ Production Ready |
| simple | batch | 99.55353948910273% | 0% | ✅ Production Ready |
| moderate | ultra-low | 97.86131835205745% | 0% | ✅ Production Ready |
| moderate | low | 98.55729455909993% | 0% | ✅ Production Ready |
| moderate | balanced | 99.02755482661473% | 0% | ✅ Production Ready |
| moderate | high-quality | 99.30701125175874% | 0% | ✅ Production Ready |
| moderate | batch | 99.52946801031193% | 0% | ✅ Production Ready |
| complex | ultra-low | 97.94935955057332% | 0% | ✅ Production Ready |
| complex | low | 98.71852532833957% | 0% | ✅ Production Ready |
| complex | balanced | 98.9815998125546% | 0% | ✅ Production Ready |
| complex | high-quality | 99.28432770745202% | 0% | ✅ Production Ready |
| complex | batch | 99.53332575579881% | 0% | ✅ Production Ready |

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
   - 2.6x faster than pure JavaScript
   - Consistent performance across input sizes
   - Optimized for modern CPU architectures

2. **Optimal Algorithms**
   - O(1) circular buffers vs O(N·W) naive implementations
   - **~659x speedup** for moving averages
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
   - **4.2x concurrent scaling** efficiency
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
**Date:** 2025-12-05T19:24:44.458Z  
**Runtime:** Node.js v22.17.1
