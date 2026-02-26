# Parallel Processing Benchmarks

This benchmark suite includes parallel processing tests using Worker Threads, SharedArrayBuffer, and Atomics for multi-threaded DSP operations.

## Architecture

### Components

1. **`lib/parallel.js`** - Thread pool manager
   - Auto-detects CPU core count
   - Conservative threading on ARM (max 4 threads) to avoid thermal throttling
   - Manages worker lifecycle and task distribution

2. **`lib/dsp-worker.js`** - Worker thread implementation
   - Processes DSP operations on signal chunks
   - Supports FIR filtering, convolution, and FFT
   - Uses Atomics for synchronization

3. **`benchmarks/raw-speed.js`** - Main benchmark suite
   - Single-threaded baselines
   - Multi-threaded parallel versions
   - Speedup calculations

### How It Works

1. **Signal Partitioning**: Large signals are divided into chunks
2. **SharedArrayBuffer**: Zero-copy data sharing between main thread and workers
3. **Atomics**: Lock-free synchronization for completion signaling
4. **Worker Pool**: Reusable worker threads to minimize overhead

### Example: Parallel FIR Filtering

```javascript
import { DspThreadPool } from "./lib/parallel.js";

const pool = new DspThreadPool(4); // 4 worker threads
await pool.init();

const signal = new Float32Array(1048576); // 1M samples
const filterConfig = {
  type: "fir",
  mode: "lowpass",
  cutoffFrequency: 2000,
  sampleRate: 10000,
  order: 51,
  windowType: "hamming",
};

// Process in parallel across 4 workers
const result = await pool.processFirFilterParallel(signal, filterConfig, 10000);

await pool.terminate();
```

### ARM/Mobile Considerations

The implementation is designed to handle ARM-specific constraints:

- **Thermal Throttling**: Limits to max 4 threads on ARM
- **Power Management**: Conservative thread count (75% of cores)
- **Sandboxed Environments**: Checks for SharedArrayBuffer availability

### Performance Expectations

Typical speedup on multi-core systems:

| Operation   | Input Size  | Cores | Expected Speedup |
| ----------- | ----------- | ----- | ---------------- |
| FIR Filter  | 1M samples  | 4     | 2.5-3.5x         |
| FIR Filter  | 1M samples  | 8     | 4.5-6.5x         |
| Convolution | 64K samples | 4     | 2.0-3.0x         |
| Convolution | 64K samples | 8     | 3.5-5.5x         |

**Note**: Speedup is sublinear due to:

- Thread creation/synchronization overhead
- Memory bandwidth saturation
- NUMA effects on large systems
- L3 cache contention

### Running Benchmarks

```bash
# Run full benchmark suite (includes parallel tests)
npm run bench:speed

# Or manually:
node benchmarks/raw-speed.js

# Run quick parallel test
node tests/test-parallel.js
```

### Requirements

- **Node.js**: 16+ (SharedArrayBuffer and Worker Threads are built-in)
- **CPU**: Multi-core recommended (2+ cores)
- **Memory**: Sufficient RAM for SharedArrayBuffer allocations

### Troubleshooting

**SharedArrayBuffer not available:**

```
Error: SharedArrayBuffer not supported
```

- **Solution**: Update to Node.js 16 or later (SharedArrayBuffer is enabled by default)
- **Check version**: `node --version` (should be v16.0.0 or higher)

**Poor speedup on ARM:**

- This is expected due to thermal throttling and power management
- Consider reducing thread count or using longer input sizes
- Mobile processors may not sustain peak performance

**Out of memory:**

- Reduce input size or thread count
- Large SharedArrayBuffers can exhaust heap
- Check `process.memoryUsage()` during benchmarks

## Implementation Details

### Zero-Copy Architecture

```
┌─────────────┐
│ Main Thread │
│             │
│ Float32Array│◄─────┐
│ (signal)    │      │
└─────────────┘      │
                     │ SharedArrayBuffer
┌─────────────┐      │ (zero-copy)
│  Worker 1   │      │
│             │◄─────┤
│ Process     │      │
│ chunk 0-N/4 │      │
└─────────────┘      │
                     │
┌─────────────┐      │
│  Worker 2   │      │
│             │◄─────┘
│ Process     │
│ chunk N/4-N/2│
└─────────────┘
```

### Atomics Synchronization

```javascript
// Initialize counter
const syncBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(syncBuffer);
Atomics.store(counter, 0, 0);

// Worker completes
Atomics.add(counter, 0, 1);
Atomics.notify(counter, 0);

// Main thread waits
while (Atomics.load(counter, 0) < numWorkers) {
  Atomics.wait(counter, 0, Atomics.load(counter, 0), 10);
}
```

## Future Enhancements

- [ ] SIMD.js integration for even faster worker operations
- [ ] WebAssembly worker threads for browser compatibility
- [ ] Adaptive thread count based on thermal monitoring
- [ ] GPU acceleration via WebGPU compute shaders
- [ ] Distributed processing across network nodes

## Contributing

ARM optimization experts welcome! If you have access to ARM development boards or mobile devices, please help test and optimize the parallel processing implementation.

**Contact**: [GitHub Issues](https://github.com/A-KGeorge/dspx/issues)
