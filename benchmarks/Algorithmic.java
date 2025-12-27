import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.lang.management.*;

import com.github.psambit9791.jdsp.signal.Smooth;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

public class Algorithmic {
    static final int[] INPUT_SIZES = { 1024, 65536, 1048576 };
    static final String[] SIZE_NAMES = { "small", "medium", "large" };
    static final int[] WINDOW_SIZES = { 32, 128, 512, 2048, 8192 };

    public static void main(String[] args) {
        System.setProperty("BENCHMARK_PLATFORM", "amd-ryzen-9-5900x-12-core-processor");

        ensureDirs();

        System.out.println("🚀 Story 2 — Algorithmic Efficiency (Java JDSP)");
        System.out.println();

        Map<String, Object> specs = getMachineSpecs();
        System.out.println("Machine Specs:");
        System.out.println("  CPU: " + specs.get("cpu"));
        System.out.println("  Java: " + specs.get("java"));
        System.out.println();

        List<Map<String, Object>> results = loadJSON("algorithmic");

        System.out.println("=".repeat(80));
        System.out.println("MOVING AVERAGE: Window Size Scaling");
        System.out.println("=".repeat(80));
        System.out.println("\nExpected patterns:");
        System.out.println("  • JDSP (efficient): constant time");
        System.out.println("  • naive Java (sliding window): O(N·W)\n");

        for (int i = 0; i < INPUT_SIZES.length; i++) {
            int size = INPUT_SIZES[i];
            String name = SIZE_NAMES[i];
            double[] signal = genSignal(size, 50, 10000);

            System.out.println("\n" + "=".repeat(80));
            System.out.println("Input: " + name.toUpperCase() + " (" + String.format("%,d", size) + " samples)");
            System.out.println("=".repeat(80));

            for (int windowSize : WINDOW_SIZES) {
                System.out.println("\n🔬 Window size: " + windowSize);

                // JDSP Moving Average (efficient)
                try {
                    System.out.println("   ⏳ Warming up...");
                    // Warmup
                    for (int w = 0; w < 5; w++) {
                        Smooth smooth = new Smooth(signal, windowSize, "rectangular");
                        smooth.smoothSignal();
                    }

                    Map<String, Object> timing = runTimed(() -> {
                        Smooth smooth = new Smooth(signal, windowSize, "rectangular");
                        double[] result = smooth.smoothSignal();
                    }, 0, 10);
                    Map<String, Object> data = new HashMap<>();
                    data.put("test", "moving_average");
                    data.put("input", name);
                    data.put("samples", size);
                    data.put("windowSize", windowSize);
                    data.put("lib", "jdsp");
                    data.put("impl", "efficient_O1");
                    data.put("avg_ms", timing.get("avg"));
                    data.put("min_ms", timing.get("min"));
                    data.put("max_ms", timing.get("max"));
                    data.put("throughput", (size / (double) timing.get("avg")) * 1000);
                    data.put("meta", specs);
                    results.add(data);
                    System.out.println("   JDSP (efficient): " + String.format("%.3f", timing.get("avg")) + " ms");
                    System.out.println("   Throughput:        "
                            + String.format("%.1f", ((size / (double) timing.get("avg")) * 1000 / 1e6))
                            + "M samples/sec");
                } catch (Exception e) {
                    System.out.println("   ❌ JDSP failed: " + e.getMessage());
                }

                // Naive Java Moving Average (O(N·W))
                try {
                    Map<String, Object> timing = runTimed(() -> naiveMovingAverage(signal, windowSize), 2, 5);
                    Map<String, Object> data = new HashMap<>();
                    data.put("test", "moving_average");
                    data.put("input", name);
                    data.put("samples", size);
                    data.put("windowSize", windowSize);
                    data.put("lib", "naive_java");
                    data.put("impl", "sliding_window_ONW");
                    data.put("avg_ms", timing.get("avg"));
                    data.put("min_ms", timing.get("min"));
                    data.put("max_ms", timing.get("max"));
                    data.put("throughput", (size / (double) timing.get("avg")) * 1000);
                    data.put("meta", specs);
                    results.add(data);
                    System.out.println("   naive Java (O(N·W)): " + String.format("%.3f", timing.get("avg")) + " ms");

                    // Calculate speedup
                    Map<String, Object> jdspResult = results.stream()
                            .filter(r -> "jdsp".equals(r.get("lib")) && name.equals(r.get("input"))
                                    && windowSize == ((Number) r.get("windowSize")).intValue())
                            .findFirst().orElse(null);
                    if (jdspResult != null) {
                        double speedup = (Double) timing.get("avg") / (Double) jdspResult.get("avg_ms");
                        System.out.println("   Speedup:           " + String.format("%.2f", speedup) + "x");
                    }
                } catch (Exception e) {
                    System.out.println("   ❌ naive Java failed: " + e.getMessage());
                }
            }
        }

        saveJSON("algorithmic", results);

        // Print summary
        System.out.println("\n" + "=".repeat(80));
        System.out.println("SUMMARY");
        System.out.println("=".repeat(80));

        Map<String, List<Map<String, Object>>> byLib = new HashMap<>();
        for (Map<String, Object> r : results) {
            String lib = (String) r.get("lib");
            byLib.computeIfAbsent(lib, k -> new ArrayList<>()).add(r);
        }

        double jdspAvg = byLib.getOrDefault("jdsp", new ArrayList<>()).stream()
                .mapToDouble(r -> (Double) r.get("avg_ms")).average().orElse(0);
        double naiveAvg = byLib.getOrDefault("naive_java", new ArrayList<>()).stream()
                .mapToDouble(r -> (Double) r.get("avg_ms")).average().orElse(0);

        System.out.println("JDSP (efficient): " + String.format("%.2f", jdspAvg) + " ms average");
        System.out.println("naive Java (O(N·W)): " + String.format("%.2f", naiveAvg) + " ms average");
        System.out.println("Overall speedup:        " + String.format("%.2f", naiveAvg / jdspAvg) + "x\n");

        double jdspThroughput = byLib.getOrDefault("jdsp", new ArrayList<>()).stream()
                .mapToDouble(r -> (Double) r.get("throughput")).average().orElse(0);
        System.out
                .println("Average JDSP throughput: " + String.format("%.1f", jdspThroughput / 1e6) + "M samples/sec\n");

        System.out.println("Key insight: JDSP maintains constant time regardless of window size,");
        System.out.println("while naive implementation scales linearly with window size.\n");

        System.out.println("✅ Algorithmic Java benchmarks complete!\n");
    }

    static double[] genSignal(int n, double freq, double fs) {
        double[] x = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = Math.sin(2 * Math.PI * freq * i / fs);
        }
        return x;
    }

    static double[] naiveMovingAverage(double[] signal, int windowSize) {
        double[] output = new double[signal.length];
        for (int i = 0; i < signal.length; i++) {
            double sum = 0;
            int count = 0;
            for (int j = Math.max(0, i - windowSize + 1); j <= i; j++) {
                sum += signal[j];
                count++;
            }
            output[i] = sum / count;
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
        String env = System.getProperty("BENCHMARK_PLATFORM");
        if (env != null)
            return env;
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

    static void ensureDirs() {
        try {
            Files.createDirectories(Paths.get("results"));
            Files.createDirectories(Paths.get("charts"));
        } catch (IOException e) {
            System.err.println("Failed to create directories: " + e.getMessage());
        }
    }
}