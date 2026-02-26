"""
concurrency-scaling-scipy.py — Concurrent DSP Pipeline Scaling
Mirrors benchmarks/concurrency-threaded.js using scipy + numpy.

Pipeline: FIR lowpass (order=51, cutoff=3kHz, sr=44100) → moving RMS (window=100)

Tests two parallelism strategies:
  - threading  : shares GIL, shows GIL contention
  - multiprocessing : true parallelism, shows real CPU scaling

Concurrency levels: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
Input: medium (65536 samples @ 44100 Hz)

Usage:
    python concurrency-scaling-scipy.py

Output:
    concurrency-scipy-threading.json
    concurrency-scipy-multiprocessing.json
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if 'BENCHMARK_PLATFORM' not in os.environ:
    os.environ['BENCHMARK_PLATFORM'] = 'amd-ryzen-9-5900x-12-core-processor'

import json
import math
import multiprocessing
import platform
import threading
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

import numpy as np
import scipy.signal as ss
import scipy.stats
from lib.common import ensureDirs, saveJSON

# ---------------------------------------------------------------------------
# Config (mirrors JS benchmark)
# ---------------------------------------------------------------------------
SAMPLE_RATE = 44100
SAMPLES = 65536
CONCURRENCY_LEVELS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
WARMUP_ITERATIONS = 5
TEST_ITERATIONS = 20

FIR_ORDER = 51
FIR_CUTOFF = 3000.0
RMS_WINDOW = 100


# ---------------------------------------------------------------------------
# DSP: build filter coefficients once (shared across workers via closure)
# ---------------------------------------------------------------------------
def build_fir_coeffs():
    nyq = SAMPLE_RATE / 2.0
    return ss.firwin(FIR_ORDER + 1, FIR_CUTOFF / nyq, window="hamming")


FIR_COEFFS = build_fir_coeffs()


def moving_rms(signal: np.ndarray, window: int) -> np.ndarray:
    """O(n) moving RMS via cumulative sum of squares."""
    sq = signal.astype(np.float64) ** 2
    cs = np.cumsum(sq)
    # full-length output; first (window-1) samples use partial window
    cs_shifted = np.empty_like(cs)
    cs_shifted[0] = 0.0
    cs_shifted[1:] = cs[:-1]
    window_sums = cs - cs_shifted
    # for first (window-1) samples, denominator is (i+1)
    counts = np.minimum(np.arange(1, len(signal) + 1), window).astype(np.float64)
    return np.sqrt(window_sums / counts).astype(np.float32)


def run_pipeline(signal: np.ndarray) -> np.ndarray:
    """
    FIR lowpass → moving RMS.
    Three Python↔C boundary crossings total (firwin coeffs are pre-built).
    """
    # Stage 1: FIR filter (scipy C backend)
    filtered = ss.lfilter(FIR_COEFFS, 1.0, signal)
    # Stage 2: moving RMS (numpy C backend)
    rms = moving_rms(filtered, RMS_WINDOW)
    return rms


# ---------------------------------------------------------------------------
# Signal generator
# ---------------------------------------------------------------------------
def generate_signal(n: int, sr: int) -> np.ndarray:
    t = np.arange(n, dtype=np.float32)
    return (
        0.3 * np.sin(2 * np.pi * 440 * t / sr)
        + 0.2 * np.sin(2 * np.pi * 880 * t / sr)
        + 0.15 * np.sin(2 * np.pi * 1320 * t / sr)
        + 0.05 * (np.random.rand(n).astype(np.float32) * 2 - 1)
    ).astype(np.float32)


# ---------------------------------------------------------------------------
# Worker target (must be module-level for multiprocessing pickling)
# ---------------------------------------------------------------------------
def _worker_task(_: int) -> float:
    """Process one pipeline, return wall-clock seconds."""
    signal = generate_signal(SAMPLES, SAMPLE_RATE)
    t0 = time.perf_counter()
    run_pipeline(signal)
    return time.perf_counter() - t0


# ---------------------------------------------------------------------------
# Stats helpers
# ---------------------------------------------------------------------------
def percentiles(values: list) -> dict:
    s = sorted(values)
    n = len(s)
    return {
        "avg": sum(s) / n,
        "p50": s[int(0.50 * n)],
        "p95": s[int(0.95 * n)],
        "p99": s[int(0.99 * n)],
        "min": s[0],
        "max": s[-1],
    }


# ---------------------------------------------------------------------------
# Benchmark runners
# ---------------------------------------------------------------------------
def run_level_threading(num: int) -> dict:
    """
    Dispatch `num` pipelines concurrently using threads.
    All threads share the GIL; scipy releases it during C calls,
    but Python frame overhead + numpy bookkeeping still contend.
    """
    signal = generate_signal(SAMPLES, SAMPLE_RATE)

    def task():
        run_pipeline(signal)

    # Warmup
    with ThreadPoolExecutor(max_workers=num) as ex:
        for _ in range(WARMUP_ITERATIONS):
            futs = [ex.submit(task) for _ in range(num)]
            for f in futs:
                f.result()

    # Measure
    iter_times = []
    with ThreadPoolExecutor(max_workers=num) as ex:
        for _ in range(TEST_ITERATIONS):
            t0 = time.perf_counter()
            futs = [ex.submit(task) for _ in range(num)]
            for f in futs:
                f.result()
            iter_times.append((time.perf_counter() - t0) * 1000)  # ms

    stats = percentiles(iter_times)
    total_samples = SAMPLES * num
    throughput = total_samples / (stats["avg"] / 1000)

    return {
        "num_pipelines": num,
        "time_avg_ms": round(stats["avg"], 3),
        "time_p50_ms": round(stats["p50"], 3),
        "time_p95_ms": round(stats["p95"], 3),
        "time_p99_ms": round(stats["p99"], 3),
        "time_min_ms": round(stats["min"], 3),
        "time_max_ms": round(stats["max"], 3),
        "throughput_samples_per_sec": int(throughput),
        "total_samples_per_iter": total_samples,
    }


def run_level_multiprocessing(num: int, executor: ProcessPoolExecutor) -> dict:
    """
    Dispatch `num` pipelines using a process pool (true parallelism, no GIL).
    Processes are pre-spawned; we just submit tasks.
    Note: each submit() still has IPC serialization overhead for args/results.
    """
    # Warmup
    for _ in range(WARMUP_ITERATIONS):
        futs = [executor.submit(_worker_task, i) for i in range(num)]
        for f in futs:
            f.result()

    # Measure
    iter_times = []
    for _ in range(TEST_ITERATIONS):
        t0 = time.perf_counter()
        futs = [executor.submit(_worker_task, i) for i in range(num)]
        for f in futs:
            f.result()
        iter_times.append((time.perf_counter() - t0) * 1000)

    stats = percentiles(iter_times)
    total_samples = SAMPLES * num
    throughput = total_samples / (stats["avg"] / 1000)

    return {
        "num_pipelines": num,
        "time_avg_ms": round(stats["avg"], 3),
        "time_p50_ms": round(stats["p50"], 3),
        "time_p95_ms": round(stats["p95"], 3),
        "time_p99_ms": round(stats["p99"], 3),
        "time_min_ms": round(stats["min"], 3),
        "time_max_ms": round(stats["max"], 3),
        "throughput_samples_per_sec": int(throughput),
        "total_samples_per_iter": total_samples,
    }


# ---------------------------------------------------------------------------
# Machine metadata
# ---------------------------------------------------------------------------
def get_meta() -> dict:
    return {
        "cpu": platform.processor() or platform.machine(),
        "cores": multiprocessing.cpu_count(),
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "os": platform.system() + " " + platform.release(),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ensureDirs()
    
    meta = get_meta()
    print("scipy/numpy Concurrent DSP Pipeline Scaling")
    print(f"  CPU    : {meta['cpu']}")
    print(f"  Cores  : {meta['cores']}")
    print(f"  Python : {meta['python']}")
    print(f"  numpy  : {meta['numpy']}")
    print(f"  scipy  : {meta['scipy']}")
    print(f"  Signal : {SAMPLES} samples @ {SAMPLE_RATE} Hz")
    print(f"  Stages : FIR(order={FIR_ORDER}, cutoff={FIR_CUTOFF}Hz) → movingRMS(window={RMS_WINDOW})")
    print()

    # -----------------------------------------------------------------------
    # THREADING
    # -----------------------------------------------------------------------
    print("=" * 70)
    print("THREADING (GIL-limited)")
    print("=" * 70)

    threading_results = []
    baseline_tp = None

    for num in CONCURRENCY_LEVELS:
        print(f"  ▶ {num:>4} pipelines ... ", end="", flush=True)
        rec = run_level_threading(num)
        if baseline_tp is None:
            baseline_tp = rec["throughput_samples_per_sec"]
        efficiency = rec["throughput_samples_per_sec"] / baseline_tp * 100
        rec["efficiency_percent"] = round(efficiency, 1)
        rec["strategy"] = "threading"
        rec["meta"] = meta
        threading_results.append(rec)
        print(
            f"avg={rec['time_avg_ms']:.1f}ms  "
            f"tput={rec['throughput_samples_per_sec']/1e6:.1f}M/s  "
            f"eff={efficiency:.1f}%"
        )

    print()

    # -----------------------------------------------------------------------
    # MULTIPROCESSING
    # -----------------------------------------------------------------------
    print()
    print("=" * 70)
    print("MULTIPROCESSING (true parallelism)")
    print("=" * 70)

    # Cap pool size at CPU count; beyond that workers queue up.
    # We use a single pool for all levels to avoid repeated spawn overhead.
    # Note: 1024 workers exceeds any realistic core count — at high levels
    # the OS scheduler and IPC serialization dominate, not the GIL.
    from concurrent.futures.process import _MAX_WINDOWS_WORKERS

    # Further cap the pool size to avoid memory issues
    pool_size = min(max(CONCURRENCY_LEVELS), multiprocessing.cpu_count() * 4, _MAX_WINDOWS_WORKERS, 16)
    print(f"  Pool size: {pool_size} processes")
    print()

    mp_results = []
    baseline_tp = None

    with ProcessPoolExecutor(max_workers=pool_size) as executor:
        for num in CONCURRENCY_LEVELS:
            print(f"  ▶ {num:>4} pipelines ... ", end="", flush=True)
            rec = run_level_multiprocessing(num, executor)
            if baseline_tp is None:
                baseline_tp = rec["throughput_samples_per_sec"]
            efficiency = rec["throughput_samples_per_sec"] / baseline_tp * 100
            rec["efficiency_percent"] = round(efficiency, 1)
            rec["strategy"] = "multiprocessing"
            rec["meta"] = meta
            mp_results.append(rec)
            print(
                f"avg={rec['time_avg_ms']:.1f}ms  "
                f"tput={rec['throughput_samples_per_sec']/1e6:.1f}M/s  "
                f"eff={efficiency:.1f}%"
            )

    # Save results to platform-specific folder
    saveJSON("concurrency-threading", threading_results)
    saveJSON("concurrency-multiprocessing", mp_results)
    print()

    # -----------------------------------------------------------------------
    # Side-by-side summary
    # -----------------------------------------------------------------------
    print()
    print("=" * 70)
    print("SUMMARY — throughput (M samples/sec)")
    print("=" * 70)
    print(f"{'pipelines':>10}  {'threading':>12}  {'multiproc':>12}  {'mp/thread':>10}")
    print("-" * 50)
    for t, m in zip(threading_results, mp_results):
        ratio = m["throughput_samples_per_sec"] / max(t["throughput_samples_per_sec"], 1)
        print(
            f"{t['num_pipelines']:>10}  "
            f"{t['throughput_samples_per_sec']/1e6:>10.1f}M  "
            f"{m['throughput_samples_per_sec']/1e6:>10.1f}M  "
            f"{ratio:>9.2f}x"
        )


if __name__ == "__main__":
    # Required for ProcessPoolExecutor on Windows/macOS
    multiprocessing.freeze_support()
    main()