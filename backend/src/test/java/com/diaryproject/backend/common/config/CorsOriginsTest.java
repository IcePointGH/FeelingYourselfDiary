package com.diaryproject.backend.common.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

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

    @Test
    void parsePatterns_alwaysIncludesLocalhostAndLoopbackPorts() {
        List<String> patterns = CorsOrigins.parsePatterns("https://www.sevensense.art");

        assertEquals(List.of("https://www.sevensense.art", "http://localhost:*", "http://127.0.0.1:*"), patterns);
    }

    @Test
    void parsePatterns_canBeUsedBySpringCorsToMatchLocalhost() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOriginPatterns(CorsOrigins.parsePatterns("https://www.sevensense.art"));

        assertEquals("http://localhost:3000", configuration.checkOrigin("http://localhost:3000"));
        assertEquals("http://localhost:5173", configuration.checkOrigin("http://localhost:5173"));
        assertNull(configuration.checkOrigin("http://evil.example"));
    }
}
