# DSP Benchmark Suite

Comprehensive performance benchmarks for DSP libraries across **JavaScript**, **Python**, and **Java**, comparing native implementations against pure language and optimized libraries across multiple performance dimensions.

## Quick Start

```bash
# Install dependencies
npm install

# Run all benchmarks + generate charts + create report
npm run benchmarks

# Or run individual stories
npm run bench:speed      # Raw computational speed (JS)
npm run bench:algo       # Algorithmic efficiency (JS)
npm run bench:speed-py   # Raw computational speed (Python)
npm run bench:algo-py    # Algorithmic efficiency (Python)
npm run bench:speed-java # Raw computational speed (Java)
npm run bench:algo-java  # Algorithmic efficiency (Java)
npm run bench:redis      # Redis state persistence
npm run bench:logging    # Logging performance

# Generate charts only (requires existing results)
npm run charts

# Generate markdown report only
npm run report
```

## Benchmarks

### Raw Computational Speed

Compares FFT, FIR filter, and convolution implementations across languages:

- **JavaScript**: dspx (Native C++ SIMD), TensorFlow.js (CPU), fft.js, fili, naive implementations
- **Python**: numpy, scipy
- **Java**: JDSP, naive implementations

**Key Metric**: Throughput (samples/sec)

![FIR Filter Throughput](./charts/12th-gen-intel-core-i5-12600t/fir_throughput.png)
_Windows x64 results_

![FFT Throughput](./charts/12th-gen-intel-core-i5-12600t/fft_throughput.png)
_Windows x64 results_

![1D Convolution Throughput](./charts/12th-gen-intel-core-i5-12600t/convolution_throughput.png)
_Windows x64 results_

### Algorithmic Efficiency

Demonstrates O(1) circular buffer vs O(N·W) naive sliding window for moving averages across languages.

- **JavaScript**: dspx, naive implementations
- **Python**: scipy (uniform filter), numpy (convolve)
- **Java**: JDSP (efficient), naive implementations

**Key Metric**: Execution time vs window size

![Moving Average (Small Input)](./charts/12th-gen-intel-core-i5-12600t/moving_avg_small.png)
_Windows x64 results_

![Moving Average (Medium Input)](./charts/12th-gen-intel-core-i5-12600t/moving_avg_medium.png)
_Windows x64 results_

### Redis Resilience

Tests state save/load operations for crash recovery with seamless processing continuation.

**Key Metric**: Serialization latency, state size

![State Persistence Latency](./charts/12th-gen-intel-core-i5-12600t/persistence_latency.png)
_Windows x64 results_

### Production Logging

Compares logging mode overhead:

- No logging (baseline)
- Batched with TopicRouter (recommended)
- Per-message callbacks
- Naive console.log (anti-pattern)

**Key Metric**: Throughput overhead (%)

![Logging Mode Performance Impact](./charts/12th-gen-intel-core-i5-12600t/logging_perf.png)
_Windows x64 results_

## Input Sizes

| Name   | Samples   | Description       |
| ------ | --------- | ----------------- |
| small  | 1,024     | Fits in L1 cache  |
| medium | 65,536    | Fits in L3 cache  |
| large  | 1,048,576 | Main-memory scale |

## Output Files

Results are organized by CPU name (auto-detected from `os.cpus()[0].model` or set via `BENCHMARK_PLATFORM` env var):

```
├── results/
│   ├── amd-ryzen-9-5900x-12-core-processor/      # AMD Ryzen 9 5900X results
│   │   ├── raw-speed.json          # JS FFT/FIR/conv benchmarks
│   │   ├── algorithmic.json        # JS moving average benchmarks
│   │   ├── raw-speed.json          # Python FFT/FIR/conv benchmarks
│   │   ├── algorithmic.json        # Python moving average benchmarks
│   │   ├── raw-speed.json          # Java FFT/FIR/conv benchmarks
│   │   ├── algorithmic.json        # Java moving average benchmarks
│   │   ├── redis.json
│   │   └── logging.json
│   ├── tensor-g4/              # Google Tensor G4 results
│   │   └── ...
│   └── ...                   # Other CPU results
│
├── charts/
│   ├── amd-ryzen-9-5900x-12-core-processor/      # AMD Ryzen 9 5900X charts
│   │   ├── fft_throughput.png
│   │   ├── fir_throughput.png
│   │   ├── convolution_throughput.png
│   │   ├── moving_avg_small.png
│   │   ├── moving_avg_medium.png
│   │   ├── moving_avg_large.png
│   │   ├── redis_latency.png
│   │   └── logging_perf.png
│   ├── tensor-g4/              # Google Tensor G4 charts
│   │   └── ...
│   └── ...                   # Other CPU charts
├── reports/
│   ├── BENCHMARKS-amd-ryzen-9-5900x.md     # AMD Ryzen 9 5900X report
│   ├── BENCHMARKS-tensor-g4.md             # Google Tensor G4 report
│   └── ...                                 # Other CPU reports
```

## ☁️ Cloud Performance (AWS Lambda)

| Architecture         | 1K Samples  | 1M Samples       |
| :------------------- | :---------- | :--------------- |
| **Graviton (arm64)** | 19.8M s/sec | **112.8M s/sec** |
| **Intel/AMD (x64)**  | 13.4M s/sec | 29.2M s/sec      |

> **Analysis:** Graviton provides ~3.8x higher throughput for large-scale buffers due to superior memory bandwidth and physical core isolation in the Lambda environment.

![AWS Lambda Comparison](./charts/lambda_comparison.png)
_AWS Lambda 2 GB ram results_

![AWS Lambda 1.0 v CPU Performance](./charts/lambda_arch_comparison.png)
_AWS Lambda 1.769 GB ram results_

## Requirements

- **Node.js** ≥ 18
- **Python** ≥ 3.8 (with numpy, scipy)
- **Java** ≥ 17 (with Maven)
- **Redis** (required for redis benchmarks)
- ~2GB RAM for large input tests

### Setup

```bash
# JavaScript dependencies
npm install

# Python dependencies (optional)
pip install -r requirements.txt

# Java dependencies (optional)
mvn compile  # Downloads JDSP dependency and compiles Java benchmarks
```

## Platform-Specific Results

The benchmark suite automatically organizes results by CPU name to enable easy cross-platform comparisons:

- **Auto-detection**: Results saved to `results/{sanitized-cpu-name}/`
  - CPU name is extracted from `os.cpus()[0].model`
  - Sanitized: lowercase, spaces to dashes, special chars removed
  - Example: "AMD Ryzen 9 5900X" → `amd-ryzen-9-5900x`
  - Example: "Tensor G4" → `tensor-g4`
- **Custom naming**: Set `BENCHMARK_PLATFORM` environment variable to override
  - Example: `BENCHMARK_PLATFORM="my-custom-device-name"`

All results include machine specifications embedded in JSON and chart subtitles:

- CPU model
- Core count
- RAM size
- OS version
- Node.js version
- dspx version

## Notes

- All benchmarks are **CPU-only** (no GPU/CUDA)
- TensorFlow.js uses CPU backend (`tfjs-node`)
- Results from all languages (JavaScript, Python, Java) are automatically combined for cross-language comparisons
- Warmup runs ensure JIT optimization
- Multiple repetitions for statistical reliability
- Results saved as JSON for custom analysis

## Example Results

**JavaScript (dspx):**

```json
{
  "test": "fft",
  "input": "medium",
  "samples": 65536,
  "lib": "dspx",
  "avg_ms": 3.1,
  "throughput": 21140000,
  "backend": "CPU (Native C++ SIMD)",
  "meta": {
    "cpu": "AMD Ryzen 9 5900X",
    "cores": 24,
    "ram": "64 GB",
    "node": "v22.0.0",
    "dspx": "0.2.0-alpha.7"
  }
}
```

**Python (scipy):**

```json
{
  "test": "moving_average",
  "input": "large",
  "samples": 1048576,
  "lib": "scipy",
  "avg_ms": 1129.7,
  "throughput": 928177,
  "impl": "uniform_filter_O1",
  "meta": {
    "cpu": "AMD Ryzen 9 5900X",
    "cores": 24,
    "ram": "64 GB",
    "os": "Windows 11 10.0",
    "node": "3.12.5"
  }
}
```

**Java (JDSP):**

```json
{
  "test": "fft",
  "input": "medium",
  "samples": 65536,
  "lib": "jdsp",
  "avg_ms": 2.33,
  "throughput": 28130000,
  "backend": "CPU (JDSP FFT)",
  "meta": {
    "cpu": "amd64 24 cores",
    "cores": 24,
    "ram": "15 GB",
    "os": "Windows 11 10.0",
    "java": "23.0.1"
  }
}
```

## Contributing

To add new benchmarks:

### JavaScript Benchmarks

1. Create `storyN-name.js` following existing patterns
2. Use helpers from `common.js`
3. Save results with `saveJSON()`
4. Update `generate-charts.js` to visualize
5. Update `generate-report.js` to document
6. Add script to `package.json`

### Python Benchmarks

1. Create `storyN-name.py` following existing patterns
2. Use helpers from `lib/common.py`
3. Save results with `saveJSON()`
4. Results automatically integrate with existing charts/reports

### Java Benchmarks

1. Create `StoryNName.java` following existing patterns
2. Use Gson for JSON serialization
3. Save results with `saveJSON()`
4. Results automatically integrate with existing charts/reports
5. Add Maven exec configuration to `pom.xml` if needed
