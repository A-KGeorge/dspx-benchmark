import java.io.*;
import java.nio.file.*;
import java.util.*;

import com.github.psambit9791.jdsp.transform.FastFourier;
import com.github.psambit9791.jdsp.signal.Convolution;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

public class RawSpeed {
    static final int[] INPUT_SIZES = { 1024, 65536, 1048576 };
    static final String[] SIZE_NAMES = { "small", "medium", "large" };

    public static void main(String[] args) {
        // Check command line args first
        if (args.length > 0) {
            System.setProperty("BENCHMARK_PLATFORM", args[0]);
        }

        ensureDirs();

        System.out.println("🚀 Story 1 — Raw Computational Speed (Java JDSP)");
        System.out.println("Comparing JDSP (Java) vs naive Java\n");

        Map<String, Object> specs = getMachineSpecs();
        String platformId = getPlatformId();
        System.out.println("Machine Specs:");
        System.out.println("  CPU: " + specs.get("cpu"));
        System.out.println("  Cores: " + specs.get("cores"));
        System.out.println("  RAM: " + specs.get("ram"));
        System.out.println("  OS: " + specs.get("os"));
        System.out.println("  Platform: " + platformId);
        System.out.println("  Java: " + specs.get("java"));
        System.out.println("");

        List<Map<String, Object>> results = loadJSON("raw-speed");

        // FFT Benchmarks
        System.out.println("=".repeat(80));
        System.out.println("FFT BENCHMARKS");
        System.out.println("=".repeat(80));

        for (int i = 0; i < INPUT_SIZES.length; i++) {
            int size = INPUT_SIZES[i];
            String name = SIZE_NAMES[i];
            double[] signal = genSignal(size, 50, 10000);

            System.out.println("\n🔬 Testing FFT with " + name + " input (" + String.format("%,d", size) + " samples)");

            // JDSP FFT
            try {
                Map<String, Object> timing = runTimed(() -> {
                    FastFourier fft = new FastFourier(signal);
                    fft.transform();
                    fft.getMagnitude(true);
                }, 3, 10);
                Map<String, Object> data = new HashMap<>();
                data.put("test", "fft");
                data.put("input", name);
                data.put("samples", size);
                data.put("lib", "jdsp");
                data.put("avg_ms", timing.get("avg"));
                data.put("min_ms", timing.get("min"));
                data.put("max_ms", timing.get("max"));
                data.put("throughput", (size / (double) timing.get("avg")) * 1000);
                data.put("backend", "CPU (JDSP FFT)");
                data.put("meta", specs);
                results.add(data);
                printResult(data);
            } catch (Exception e) {
                System.out.println("❌ JDSP FFT failed: " + e.getMessage());
            }
        }

        // FIR Filter Benchmarks
        System.out.println("\n" + "=".repeat(80));
        System.out.println("FIR FILTER BENCHMARKS");
        System.out.println("=".repeat(80));

        for (int i = 0; i < INPUT_SIZES.length; i++) {
            int size = INPUT_SIZES[i];
            String name = SIZE_NAMES[i];
            double[] signal = genSignal(size, 50, 10000);
            double[] coeffs = generateFirCoefficients(51, 2000, 10000);

            System.out.println(
                    "\n🔬 Testing FIR Filter with " + name + " input (" + String.format("%,d", size) + " samples)");

            // JDSP FIR
            try {
                Map<String, Object> timing = runTimed(() -> {
                    Convolution conv = new Convolution(signal, coeffs);
                    conv.convolve();
                }, 2, 5);
                Map<String, Object> data = new HashMap<>();
                data.put("test", "fir_filter");
                data.put("input", name);
                data.put("samples", size);
                data.put("lib", "jdsp");
                data.put("avg_ms", timing.get("avg"));
                data.put("min_ms", timing.get("min"));
                data.put("max_ms", timing.get("max"));
                data.put("throughput", (size / (double) timing.get("avg")) * 1000);
                data.put("backend", "CPU (JDSP FIR)");
                data.put("meta", specs);
                results.add(data);
                printResult(data);
            } catch (Exception e) {
                System.out.println("❌ JDSP FIR failed: " + e.getMessage());
            }
        }

        // Convolution Benchmarks
        System.out.println("\n" + "=".repeat(80));
        System.out.println("1D CONVOLUTION BENCHMARKS (Kernel Size Scaling)");
        System.out.println("=".repeat(80));

        int[] kernelSizes = { 8, 32, 64, 128, 256 };
        int convSignalSize = 65536;

        System.out.println("ℹ️  Note: Using batch mode for fair comparison\n");

        for (int kernelSize : kernelSizes) {
            double[] signal = genSignal(convSignalSize, 50, 10000);
            double[] kernel = new double[kernelSize];
            for (int j = 0; j < kernelSize; j++)
                kernel[j] = Math.random();

            System.out.println("\n🔬 Testing 1D Convolution: signal=" + String.format("%,d", convSignalSize)
                    + ", kernel=" + kernelSize);

            // JDSP Convolution
            try {
                Map<String, Object> timing = runTimed(() -> {
                    Convolution conv = new Convolution(signal, kernel);
                    conv.convolve();
                }, 2, 5);
                Map<String, Object> data = new HashMap<>();
                data.put("test", "conv1d");
                data.put("input", "medium");
                data.put("samples", convSignalSize);
                data.put("kernel_size", kernelSize);
                data.put("lib", "jdsp");
                data.put("avg_ms", timing.get("avg"));
                data.put("min_ms", timing.get("min"));
                data.put("max_ms", timing.get("max"));
                data.put("throughput", (convSignalSize / (double) timing.get("avg")) * 1000);
                data.put("backend", "CPU (JDSP Conv)");
                data.put("meta", specs);
                results.add(data);
                printResult(data);
            } catch (Exception e) {
                System.out.println("❌ JDSP conv failed: " + e.getMessage());
            }

            // Naive Java Convolution
            try {
                Map<String, Object> timing = runTimed(() -> naiveConv(signal, kernel), 2, 5);
                Map<String, Object> data = new HashMap<>();
                data.put("test", "conv1d");
                data.put("input", "medium");
                data.put("samples", convSignalSize);
                data.put("kernel_size", kernelSize);
                data.put("lib", "naive_java");
                data.put("avg_ms", timing.get("avg"));
                data.put("min_ms", timing.get("min"));
                data.put("max_ms", timing.get("max"));
                data.put("throughput", (convSignalSize / (double) timing.get("avg")) * 1000);
                data.put("backend", "CPU (naive Java)");
                data.put("meta", specs);
                results.add(data);
                printResult(data);
            } catch (Exception e) {
                System.out.println("❌ naive Java conv failed: " + e.getMessage());
            }
        }

        saveJSON("raw-speed", results);
        getSummaryLine(results);

        System.out.println("✅ Story 1 Java benchmarks complete!\n");
    }

    static double[] genSignal(int n, double freq, double fs) {
        double[] x = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = Math.sin(2 * Math.PI * freq * i / fs);
        }
        return x;
    }

    static double[] generateFirCoefficients(int order, double cutoffFreq, double sampleRate) {
        // Simple sinc FIR
        double[] coeffs = new double[order];
        double fc = cutoffFreq / sampleRate;
        int center = (order - 1) / 2;
        for (int i = 0; i < order; i++) {
            int n = i - center;
            if (n == 0)
                coeffs[i] = 2 * fc;
            else
                coeffs[i] = Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
            coeffs[i] *= 0.5 * (1 + Math.cos(Math.PI * n / center)); // Hamming window
        }
        return coeffs;
    }

    static double[] naiveConv(double[] signal, double[] kernel) {
        int signalLen = signal.length;
        int kernelLen = kernel.length;
        int outputLen = signalLen - kernelLen + 1;
        double[] output = new double[outputLen];
        for (int i = 0; i < outputLen; i++) {
            for (int j = 0; j < kernelLen; j++) {
                output[i] += signal[i + j] * kernel[kernelLen - 1 - j];
            }
        }
        return output;
    }

    static Map<String, Object> runTimed(Runnable fn, int warmups, int reps) {
        // Warmup
        for (int i = 0; i < warmups; i++)
            fn.run();

        // Benchmark
        List<Double> times = new ArrayList<>();
        for (int i = 0; i < reps; i++) {
            long t0 = System.nanoTime();
            fn.run();
            double ms = (System.nanoTime() - t0) / 1e6;
            times.add(ms);
        }

        double avg = times.stream().mapToDouble(d -> d).average().orElse(0);
        double min = times.stream().mapToDouble(d -> d).min().orElse(0);
        double max = times.stream().mapToDouble(d -> d).max().orElse(0);

        Map<String, Object> result = new HashMap<>();
        result.put("avg", avg);
        result.put("min", min);
        result.put("max", max);
        result.put("times", times);
        return result;
    }

    static Map<String, Object> getMachineSpecs() {
        Map<String, Object> specs = new HashMap<>();
        specs.put("cpu", System.getProperty("os.arch") + " " + Runtime.getRuntime().availableProcessors() + " cores");
        specs.put("cores", Runtime.getRuntime().availableProcessors());
        specs.put("ram", (Runtime.getRuntime().maxMemory() / (1024 * 1024 * 1024)) + " GB");
        specs.put("os", System.getProperty("os.name") + " " + System.getProperty("os.version"));
        specs.put("java", System.getProperty("java.version"));
        specs.put("dspx", "N/A");
        return specs;
    }

    static String getPlatformId() {
        // Check environment variable first
        String env = System.getenv("BENCHMARK_PLATFORM");
        if (env != null && !env.isEmpty())
            return env;

        // Then check system property
        String prop = System.getProperty("BENCHMARK_PLATFORM");
        if (prop != null && !prop.isEmpty())
            return prop;

        return "unknown-platform";
    }

    static void saveJSON(String file, List<Map<String, Object>> data) {
        String platformId = getPlatformId();
        Path resultsDir = Paths.get("results", platformId);
        try {
            Files.createDirectories(resultsDir);
            Path filePath = resultsDir.resolve(file + ".json");

            // Load existing data
            List<Map<String, Object>> existingData = loadJSON(file);

            // Combine existing and new data
            List<Map<String, Object>> combinedData = new ArrayList<>(existingData);
            combinedData.addAll(data);

            Gson gson = new GsonBuilder().setPrettyPrinting().create();
            String json = gson.toJson(combinedData);
            Files.writeString(filePath, json);
            System.out.println("📊 Results saved to: " + filePath);
        } catch (IOException e) {
            System.err.println("Failed to save JSON: " + e.getMessage());
        }
    }

    static List<Map<String, Object>> loadJSON(String file) {
        String platformId = getPlatformId();
        Path filePath = Paths.get("results", platformId, file + ".json");
        if (!Files.exists(filePath))
            return new ArrayList<>();
        try {
            String content = Files.readString(filePath);
            Gson gson = new Gson();
            TypeToken<List<Map<String, Object>>> typeToken = new TypeToken<List<Map<String, Object>>>() {
            };
            return gson.fromJson(content, typeToken.getType());
        } catch (IOException e) {
            System.err.println("Could not load " + file + ".json: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    static void printResult(Map<String, Object> result) {
        System.out.println("\n📈 " + result.get("test") + " - " + result.get("input") + " ("
                + String.format("%,d", ((Number) result.get("samples")).intValue()) + " samples)");
        System.out.println("   Library: " + result.get("lib"));
        System.out.println("   Avg time: " + String.format("%.2f", result.get("avg_ms")) + " ms");
        System.out.println(
                "   Throughput: "
                        + formatThroughput(((Number) result.get("samples")).intValue(), (Double) result.get("avg_ms")));
        if (result.containsKey("backend")) {
            System.out.println("   Backend: " + result.get("backend"));
        }
    }

    static String formatThroughput(int samples, double avgMs) {
        double samplesPerSec = (samples / avgMs) * 1000;
        if (samplesPerSec >= 1e6) {
            return String.format("%.2f", samplesPerSec / 1e6) + "M samples/sec";
        } else if (samplesPerSec >= 1e3) {
            return String.format("%.2f", samplesPerSec / 1e3) + "K samples/sec";
        } else {
            return String.format("%.2f", samplesPerSec) + " samples/sec";
        }
    }

    static void ensureDirs() {
        try {
            Files.createDirectories(Paths.get("results"));
            Files.createDirectories(Paths.get("charts"));
        } catch (IOException e) {
            System.err.println("Failed to create directories: " + e.getMessage());
        }
    }

    static void getSummaryLine(List<Map<String, Object>> results) {
        Map<String, List<Map<String, Object>>> byLib = new HashMap<>();
        for (Map<String, Object> r : results) {
            String lib = (String) r.get("lib");
            byLib.computeIfAbsent(lib, k -> new ArrayList<>()).add(r);
        }

        System.out.println("\n" + "=".repeat(80));
        System.out.println("SUMMARY");
        System.out.println("=".repeat(80));
        for (Map.Entry<String, List<Map<String, Object>>> entry : byLib.entrySet()) {
            double avgThroughput = entry.getValue().stream()
                    .mapToDouble(r -> (((Number) r.get("samples")).doubleValue() / (Double) r.get("avg_ms")) * 1000)
                    .average().orElse(0);
            System.out.println(
                    entry.getKey() + String.format("%20s", "") + " → " + formatThroughput(1000, 1000 / avgThroughput));
        }
        System.out.println("=".repeat(80) + "\n");
    }
}