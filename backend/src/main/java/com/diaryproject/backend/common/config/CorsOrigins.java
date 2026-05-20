package com.diaryproject.backend.common.config;

import java.util.Arrays;
import java.util.List;

public final class CorsOrigins {

    private CorsOrigins() {
    }

    public static List<String> parse(String allowedOrigins) {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return defaults();
        }
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
        return origins.isEmpty() ? defaults() : origins;
    }

    public static List<String> parsePatterns(String allowedOrigins) {
        List<String> patterns = new java.util.ArrayList<>(parse(allowedOrigins));
        addIfMissing(patterns, "http://localhost:*");
        addIfMissing(patterns, "http://127.0.0.1:*");
        return List.copyOf(patterns);
    }

    private static void addIfMissing(List<String> values, String value) {
        if (!values.contains(value)) {
            values.add(value);
        }
    }

    private static List<String> defaults() {
        return List.of("http://localhost:3000", "http://127.0.0.1:3000");
    }
}
