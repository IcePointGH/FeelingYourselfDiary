package com.diaryproject.backend.common.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CorsOriginsTest {

    @Test
    void parse_trimsCommaSeparatedOrigins() {
        List<String> origins = CorsOrigins.parse("http://localhost:3000, http://127.0.0.1:3000");

        assertEquals(List.of("http://localhost:3000", "http://127.0.0.1:3000"), origins);
    }

    @Test
    void parse_usesLocalhostAndLoopbackDefaultsWhenBlank() {
        List<String> origins = CorsOrigins.parse(" ");

        assertEquals(List.of("http://localhost:3000", "http://127.0.0.1:3000"), origins);
    }
}
