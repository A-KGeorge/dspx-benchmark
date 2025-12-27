"""
Common utilities for dspx benchmarks (Python version)
"""
import os
import platform
import json
import time
import numpy as np
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

INPUT_SIZES = [
    {"name": "small", "length": 1024, "desc": "Fits in L1 cache"},
    {"name": "medium", "length": 65536, "desc": "Fits in L3 cache"},
    {"name": "large", "length": 1048576, "desc": "Main-memory scale"},
]

def genSignal(n, freq=50, fs=10000):
    """Generate a test signal (sine wave)"""
    t = np.arange(n) / fs
    return np.sin(2 * np.pi * freq * t).astype(np.float32)

def getMachineSpecs():
    """Get machine specifications"""
    try:
        cpu = platform.processor() or "Unknown"
        if cpu == "Unknown":
            # Try to get from /proc/cpuinfo on Linux
            try:
                with open("/proc/cpuinfo", "r") as f:
                    for line in f:
                        if line.startswith("model name"):
                            cpu = line.split(":")[1].strip()
                            break
            except:
                pass
    except:
        cpu = "Unknown"

    cores = os.cpu_count() or 1

    if HAS_PSUTIL:
        ram = f"{psutil.virtual_memory().total / (1024**3):.0f} GB"
    else:
        ram = "Unknown"

    arch = platform.machine()
    os_name = f"{platform.system()} {platform.release()}"
    python_ver = platform.python_version()

    # No dspx in Python, so skip
    dspx_ver = "N/A"

    return {
        "cpu": cpu,
        "cores": cores,
        "ram": ram,
        "arch": arch,
        "os": os_name,
        "node": python_ver,  # Using python version instead of node
        "dspx": dspx_ver,
    }

def runTimed(name, fn, warmups=2, reps=5):
    """Run a benchmark with warmup and multiple repetitions"""
    # Warmup runs
    for i in range(warmups):
        fn()

    # Actual benchmark runs
    times = []
    mem_before = psutil.virtual_memory().used if HAS_PSUTIL else 0

    for i in range(reps):
        t0 = time.perf_counter()
        fn()
        times.append((time.perf_counter() - t0) * 1000)  # Convert to ms

    mem_after = psutil.virtual_memory().used if HAS_PSUTIL else 0
    avg = sum(times) / len(times)
    min_t = min(times)
    max_t = max(times)
    p99 = max_t  # Approximation

    return {
        "avg": avg,
        "min": min_t,
        "max": max_t,
        "p99": p99,
        "rss": mem_after if HAS_PSUTIL else 0,
        "heapUsed": mem_after - mem_before if HAS_PSUTIL else 0,
        "times": times,
    }

def sanitizeCpuName(cpuName):
    """Sanitize CPU name for use as directory name"""
    import re
    cpuName = re.sub(r'\(R\)', '', cpuName)
    cpuName = re.sub(r'\(TM\)', '', cpuName)
    cpuName = re.sub(r'\s+', '-', cpuName)
    cpuName = re.sub(r'[^\w-]', '', cpuName)
    cpuName = re.sub(r'^-+|-+$', '', cpuName)
    cpuName = re.sub(r'-+', '-', cpuName)
    return cpuName.lower()

def getPlatformId():
    """Get platform identifier"""
    if "BENCHMARK_PLATFORM" in os.environ:
        return os.environ["BENCHMARK_PLATFORM"]

    cpu = platform.processor() or "unknown-cpu"
    if cpu in ["unknown-cpu", "Unknown", "unknown"]:
        try:
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if line.startswith("model name"):
                        cpu = line.split(":")[1].strip()
                        break
        except:
            pass

    return sanitizeCpuName(cpu)

def saveJSON(file, data, usePlatformDir=True):
    """Save JSON results"""
    platformId = getPlatformId() if usePlatformDir else None
    resultsDir = os.path.join(os.getcwd(), "results", platformId) if platformId else os.path.join(os.getcwd(), "results")

    os.makedirs(resultsDir, exist_ok=True)
    filePath = os.path.join(resultsDir, f"{file}.json")
    with open(filePath, "w") as f:
        json.dump(data, f, indent=2)
    print(f"📊 Results saved to: {filePath}")

def loadJSON(file, usePlatformDir=True):
    """Load JSON results"""
    platformId = getPlatformId() if usePlatformDir else None
    filePath = os.path.join(os.getcwd(), "results", platformId, f"{file}.json") if platformId else os.path.join(os.getcwd(), "results", f"{file}.json")

    try:
        with open(filePath, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Could not load {file}.json: {e}")
        return None

def formatThroughput(samples, avgMs):
    """Format throughput for display"""
    samplesPerSec = (samples / avgMs) * 1000
    if samplesPerSec >= 1e6:
        return f"{samplesPerSec / 1e6:.2f}M samples/sec"
    elif samplesPerSec >= 1e3:
        return f"{samplesPerSec / 1e3:.2f}K samples/sec"
    else:
        return f"{samplesPerSec:.2f} samples/sec"

def printResult(result):
    """Print a benchmark result"""
    print(f"\n📈 {result['test']} - {result['input']} ({result['samples']:,} samples)")
    print(f"   Library: {result['lib']}")
    print(f"   Avg time: {result['avg_ms']:.2f} ms")
    print(f"   Throughput: {formatThroughput(result['samples'], result['avg_ms'])}")
    if "backend" in result:
        print(f"   Backend: {result['backend']}")

def ensureDirs():
    """Create directories if they don't exist"""
    dirs = ["results", "charts"]
    for dir in dirs:
        os.makedirs(os.path.join(os.getcwd(), dir), exist_ok=True)

def getSummaryLine(results):
    """Get a summary line for console output"""
    byLib = {}
    for r in results:
        lib = r["lib"]
        if lib not in byLib:
            byLib[lib] = []
        byLib[lib].append(r)

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)

    for lib, libResults in byLib.items():
        avgThroughput = sum((r["samples"] / r["avg_ms"]) * 1000 for r in libResults) / len(libResults)
        print(f"{lib:<20} → {formatThroughput(1000, 1000 / avgThroughput)}")
    print("="*80 + "\n")