"""
Story 2 — Algorithmic Efficiency (Python numpy vs scipy)

Demonstrates efficiency for moving average implementations:
- scipy.signal.uniform_filter1d (efficient)
- numpy convolve (naive sliding window)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if 'BENCHMARK_PLATFORM' not in os.environ:
    os.environ['BENCHMARK_PLATFORM'] = 'amd-ryzen-9-5900x-12-core-processor'

import numpy as np
from scipy import signal, ndimage
from lib.common import *

ensureDirs()

print("🚀 Story 2 — Algorithmic Efficiency (Python)\n")

specs = getMachineSpecs()
print("Machine Specs:")
print(f"  CPU: {specs['cpu']}")
print(f"  Python: {specs['node']}\n")

WINDOW_SIZES = [32, 128, 512, 2048, 8192]
results = loadJSON("algorithmic") or []

print("="*80)
print("MOVING AVERAGE: Window Size Scaling")
print("="*80)
print("\nExpected patterns:")
print("  • scipy (uniform filter): efficient")
print("  • numpy (convolve): O(N·W) sliding window\n")

for size in INPUT_SIZES:
    signal_data = genSignal(size["length"], 50, 10000)

    print(f"\n{'='*80}")
    print(f"Input: {size['name'].upper()} ({size['length']:,} samples)")
    print("="*80)

    for windowSize in WINDOW_SIZES:
        print(f"\n🔬 Window size: {windowSize}")

        # --- scipy Moving Average (efficient) ---
        try:
            print("   ⏳ Warming up...")
            # Warmup
            for i in range(5):
                ndimage.uniform_filter1d(signal_data, size=windowSize)

            result = runTimed(
                f"scipy-ma-{windowSize}",
                lambda: ndimage.uniform_filter1d(signal_data, size=windowSize),
                0,
                10
            )

            data = {
                "test": "moving_average",
                "input": size["name"],
                "samples": size["length"],
                "windowSize": windowSize,
                "lib": "scipy",
                "impl": "uniform_filter_O1",
                "avg_ms": result["avg"],
                "min_ms": result["min"],
                "max_ms": result["max"],
                "throughput": (size["length"] / result["avg"]) * 1000,
                "meta": specs,
            }

            results.append(data)
            print(f"   scipy (uniform): {result['avg']:.3f} ms")
            print(f"   Throughput:        {((size['length'] / result['avg']) * 1000 / 1e6):.1f}M samples/sec")
        except Exception as e:
            print(f"   ❌ scipy failed: {e}")

        # --- numpy Moving Average (convolve, O(N·W)) ---
        try:
            kernel = np.ones(windowSize) / windowSize
            result = runTimed(
                f"numpy-ma-{windowSize}",
                lambda: np.convolve(signal_data, kernel, mode='valid'),
                2,
                5
            )

            data = {
                "test": "moving_average",
                "input": size["name"],
                "samples": size["length"],
                "windowSize": windowSize,
                "lib": "numpy",
                "impl": "convolve_ONW",
                "avg_ms": result["avg"],
                "min_ms": result["min"],
                "max_ms": result["max"],
                "throughput": (size["length"] / result["avg"]) * 1000,
                "meta": specs,
            }

            results.append(data)
            print(f"   numpy (convolve): {result['avg']:.3f} ms")

            # Calculate speedup
            scipy_result = next((r for r in results if r["lib"] == "scipy" and r["input"] == size["name"] and r["windowSize"] == windowSize), None)
            if scipy_result:
                speedup = result["avg"] / scipy_result["avg_ms"]
                print(f"   Speedup:           {speedup:.2f}x")
        except Exception as e:
            print(f"   ❌ numpy failed: {e}")

# Save results
saveJSON("algorithmic", results)

# Print summary
print("\n" + "="*80)
print("SUMMARY")
print("="*80)

scipy_avg = sum(r["avg_ms"] for r in results if r["lib"] == "scipy") / len([r for r in results if r["lib"] == "scipy"])
numpy_avg = sum(r["avg_ms"] for r in results if r["lib"] == "numpy") / len([r for r in results if r["lib"] == "numpy"])

print(f"scipy (uniform filter): {scipy_avg:.2f} ms average")
print(f"numpy (convolve):       {numpy_avg:.2f} ms average")
print(f"Overall speedup:        {(numpy_avg / scipy_avg):.2f}x\n")

# Calculate average throughput
scipy_throughput = sum(r["throughput"] for r in results if r["lib"] == "scipy") / len([r for r in results if r["lib"] == "scipy"])
print(f"Average scipy throughput: {(scipy_throughput / 1e6):.1f}M samples/sec\n")

print("Key insight: scipy uniform_filter maintains efficiency,")
print("while numpy convolve scales with window size.\n")

print("✅ Algorithmic Python benchmarks complete!\n")