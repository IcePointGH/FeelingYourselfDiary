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

    private static List<String> defaults() {
        return List.of("http://localhost:3000", "http://127.0.0.1:3000");
    }
}
