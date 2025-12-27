"""
Story 1 — Raw Computational Speed (Python scipy/numpy vs JS)

Benchmarks FFT and FIR filter implementations across:
- scipy (Python scientific computing)
- numpy (Python numerical computing)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if 'BENCHMARK_PLATFORM' not in os.environ:
    os.environ['BENCHMARK_PLATFORM'] = 'amd-ryzen-9-5900x-12-core-processor'

import numpy as np
from scipy import fft, signal
from lib.common import *

ensureDirs()

print("🚀 Story 1 — Raw Computational Speed\n")
print("Comparing scipy (Python) vs numpy (Python)\n")

specs = getMachineSpecs()
platformId = getPlatformId()
print("Machine Specs:")
print(f"  CPU: {specs['cpu']}")
print(f"  Cores: {specs['cores']}")
print(f"  RAM: {specs['ram']}")
print(f"  OS: {specs['os']}")
print(f"  Platform: {platformId}")
print(f"  Python: {specs['node']}")
print("")

results = loadJSON("raw-speed") or []

# ============================================================================
# FFT Benchmarks
# ============================================================================

print("="*80)
print("FFT BENCHMARKS")
print("="*80)

for size in INPUT_SIZES:
    signal_data = genSignal(size["length"], 50, 10000)

    print(f"\n🔬 Testing FFT with {size['name']} input ({size['length']:,} samples)")

    # --- scipy FFT ---
    try:
        result = runTimed(
            "scipy-fft",
            lambda: fft.fft(signal_data),
            3,
            10
        )

        data = {
            "test": "fft",
            "input": size["name"],
            "samples": size["length"],
            "lib": "scipy",
            "avg_ms": result["avg"],
            "min_ms": result["min"],
            "max_ms": result["max"],
            "throughput": (size["length"] / result["avg"]) * 1000,
            "backend": "CPU (scipy.fft)",
            "meta": specs,
        }

        results.append(data)
        printResult(data)
    except Exception as e:
        print(f"❌ scipy FFT failed: {e}")

# ============================================================================
# FIR Filter Benchmarks
# ============================================================================

# Generate FIR lowpass coefficients using scipy
def generateFirCoefficients(order, cutoffFreq, sampleRate):
    return signal.firwin(order + 1, cutoffFreq / (sampleRate / 2), window='hamming')

print("\n" + "="*80)
print("FIR FILTER BENCHMARKS")
print("="*80)

for size in INPUT_SIZES:
    signal_data = genSignal(size["length"], 50, 10000)
    filterOrder = 51
    cutoffFreq = 2000
    sampleRate = 10000

    print(f"\n🔬 Testing FIR Filter with {size['name']} input ({size['length']:,} samples)")

    # Generate coefficients
    coeffs = generateFirCoefficients(filterOrder, cutoffFreq, sampleRate)

    # --- scipy FIR Filter ---
    try:
        result = runTimed(
            "scipy-fir",
            lambda: signal.lfilter(coeffs, 1.0, signal_data),
            2,
            5
        )

        data = {
            "test": "fir_filter",
            "input": size["name"],
            "samples": size["length"],
            "lib": "scipy",
            "avg_ms": result["avg"],
            "min_ms": result["min"],
            "max_ms": result["max"],
            "throughput": (size["length"] / result["avg"]) * 1000,
            "backend": "CPU (scipy.signal)",
            "meta": specs,
        }

        results.append(data)
        printResult(data)
    except Exception as e:
        print(f"❌ scipy FIR failed: {e}")

print("\n" + "="*80)
print("1D CONVOLUTION BENCHMARKS (Kernel Size Scaling)")
print("="*80)

KERNEL_SIZES = [8, 32, 64, 128, 256]
CONV_SIGNAL_SIZE = 65536

print("ℹ️  Note: Using batch mode for fair comparison\n")

for kernelSize in KERNEL_SIZES:
    signal_data = genSignal(CONV_SIGNAL_SIZE, 50, 10000)
    kernel = np.random.random(kernelSize).astype(np.float32)

    print(f"\n🔬 Testing 1D Convolution: signal={CONV_SIGNAL_SIZE:,}, kernel={kernelSize}")

    # --- numpy Convolution ---
    try:
        result = runTimed(
            "numpy-conv",
            lambda: np.convolve(signal_data, kernel, mode='valid'),
            2,
            5
        )

        data = {
            "test": "conv1d",
            "input": "medium",
            "samples": CONV_SIGNAL_SIZE,
            "kernel_size": kernelSize,
            "lib": "numpy",
            "avg_ms": result["avg"],
            "min_ms": result["min"],
            "max_ms": result["max"],
            "throughput": (CONV_SIGNAL_SIZE / result["avg"]) * 1000,
            "backend": "CPU (numpy.convolve)",
            "meta": specs,
        }

        results.append(data)
        printResult(data)
    except Exception as e:
        print(f"❌ numpy conv failed: {e}")

    # --- scipy Convolution ---
    try:
        result = runTimed(
            "scipy-conv",
            lambda: signal.convolve(signal_data, kernel, mode='valid'),
            2,
            5
        )

        data = {
            "test": "conv1d",
            "input": "medium",
            "samples": CONV_SIGNAL_SIZE,
            "kernel_size": kernelSize,
            "lib": "scipy",
            "avg_ms": result["avg"],
            "min_ms": result["min"],
            "max_ms": result["max"],
            "throughput": (CONV_SIGNAL_SIZE / result["avg"]) * 1000,
            "backend": "CPU (scipy.signal.convolve)",
            "meta": specs,
        }

        results.append(data)
        printResult(data)
    except Exception as e:
        print(f"❌ scipy conv failed: {e}")

# Save results
saveJSON("raw-speed", results)
getSummaryLine(results)

print("✅ Story 1 Python benchmarks complete!\n")