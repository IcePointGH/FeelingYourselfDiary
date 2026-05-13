package com.diaryproject.backend.ai.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiTitleNormalizerTest {

    private final AiTitleNormalizer normalizer = new AiTitleNormalizer();

    @Test
    void normalize_removesSurroundingQuotes() {
        assertEquals("散步后的平静", normalizer.normalize("\"散步后的平静\""));
        assertEquals("散步后的平静", normalizer.normalize("'散步后的平静'"));
    }

    @Test
    void normalize_trimsAndLimitsToFifteenCharacters() {
        assertEquals("一二三四五六七八九十一二三四五", normalizer.normalize(" 一二三四五六七八九十一二三四五六七 "));
    }

    @Test
    void normalize_returnsBlankForNull() {
        assertEquals("", normalizer.normalize(null));
    }
}
