# dspx Benchmark Suite

Comprehensive performance benchmarks for the **dspx** library, comparing native C++ SIMD implementations against pure JavaScript and TensorFlow.js (CPU) across multiple performance dimensions.

## Quick Start

```bash
# Install dependencies
npm install

# Run all benchmarks + generate charts + create report
npm run bench:all

# Or run individual stories
npm run bench:speed      # Raw computational speed
npm run bench:algo       # Algorithmic efficiency
npm run bench:redis      # Redis state persistence
npm run bench:logging    # Logging performance

# Generate charts only (requires existing results)
npm run charts

# Generate markdown report only
npm run report
```

## Benchmarks

### Raw Computational Speed

Compares FFT and FIR filter implementations:

- **dspx**: Native C++ SIMD (N-API)
- **TensorFlow.js**: CPU backend (tfjs-node)
- **Pure JS**: fft.js, dsp.js

**Key Metric**: Throughput (samples/sec)

![FIR Filter Throughput](./charts/win32-x64/fir_throughput.png)
_Windows x64 results_

![FFT Throughput](./charts/win32-x64/fft_throughput.png)
_Windows x64 results_

![1D Convolution Throughput](./charts/win32-x64/convolution_throughput.png)
_Windows x64 results_

### Algorithmic Efficiency

Demonstrates O(1) circular buffer vs O(N·W) naive sliding window for moving averages.

**Key Metric**: Execution time vs window size

![Moving Average (Small Input)](./charts/win32-x64/moving_avg_small.png)
_Windows x64 results_

![Moving Average (Medium Input)](./charts/win32-x64/moving_avg_medium.png)
_Windows x64 results_

### Redis Resilience

Tests state save/load operations for crash recovery with seamless processing continuation.

**Key Metric**: Serialization latency, state size

![State Persistence Latency](./charts/win32-x64/redis_latency.png)
_Windows x64 results_

### Production Logging

Compares logging mode overhead:

- No logging (baseline)
- Batched with TopicRouter (recommended)
- Per-message callbacks
- Naive console.log (anti-pattern)

**Key Metric**: Throughput overhead (%)

![Logging Mode Performance Impact](./charts/win32-x64/logging_perf.png)
_Windows x64 results_

## Input Sizes

| Name   | Samples   | Description       |
| ------ | --------- | ----------------- |
| small  | 1,024     | Fits in L1 cache  |
| medium | 65,536    | Fits in L3 cache  |
| large  | 1,048,576 | Main-memory scale |

## Output Files

Results are organized by platform (auto-detected as `${os.platform()}-${process.arch}` or set via `BENCHMARK_PLATFORM` env var):

```
├── results/
│   ├── win32-x64/              # Windows x64 results
│   │   ├── raw-speed.json
│   │   ├── algorithmic.json
│   │   ├── redis.json
│   │   └── logging.json
│   └── linux-arm64/            # Example: Linux ARM64 results
│       └── ...
├── charts/
│   ├── win32-x64/              # Windows x64 charts
│   │   ├── fft_throughput.png
│   │   ├── fir_throughput.png
│   │   ├── moving_avg_small.png
│   │   ├── moving_avg_medium.png
│   │   ├── redis_latency.png
│   │   └── logging_perf.png
│   └── linux-arm64/            # Example: Linux ARM64 charts
│       └── ...
├── BENCHMARKS-win32-x64.md     # Windows x64 report
└── BENCHMARKS-linux-arm64.md   # Example: Linux ARM64 report
```

## Requirements

- Node.js ≥ 18
- Redis (required for redis benchmarks)
- ~2GB RAM for large input tests

## Platform-Specific Results

The benchmark suite automatically organizes results by platform to enable cross-platform comparisons:

- **Auto-detection**: Results saved to `results/${os.platform()}-${process.arch}/`
- **Custom naming**: Set `BENCHMARK_PLATFORM` environment variable for specific device names
  - Example: `BENCHMARK_PLATFORM="pixel-9-pro-xl-linux-arm64"`

All results include machine specifications embedded in JSON and chart subtitles:

- CPU model
- Core count
- RAM size
- OS version
- Node.js version
- dspx version

### Continuous Integration

The repository includes a GitHub Actions workflow that automatically runs benchmarks on:

- **Windows x64** (github-actions-win32-x64)
- **Linux ARM64** (github-actions-linux-arm64)

Results are committed back to the repository automatically:
- Triggered on push to main, pull requests, and weekly schedule (Sundays)
- Results stored in `results/github-actions-{platform}/`
- Charts generated in `charts/github-actions-{platform}/`
- Reports created as `BENCHMARKS-github-actions-{platform}.md`

You can also manually trigger benchmarks from the Actions tab on GitHub.

## Notes

- All benchmarks are **CPU-only** (no GPU/CUDA)
- TensorFlow.js uses CPU backend (`tfjs-node`)
- Warmup runs ensure JIT optimization
- Multiple repetitions for statistical reliability
- Results saved as JSON for custom analysis

## Example Results

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

## Contributing

To add new benchmarks:

1. Create `storyN-name.js` following existing patterns
2. Use helpers from `common.js`
3. Save results with `saveJSON()`
4. Update `generate-charts.js` to visualize
5. Update `generate-report.js` to document
6. Add script to `package.json`
