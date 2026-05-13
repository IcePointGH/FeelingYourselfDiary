package com.diaryproject.backend.ai.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiDiarySummaryParserTest {

    private final AiDiarySummaryParser parser = new AiDiarySummaryParser();

    @Test
    void parse_supportsEnglishMarkersAndMultilineContent() {
        AiDiarySummaryParser.ParsedSummary result = parser.parse("""
                TITLE: Morning reflection
                CONTENT: I felt calm today.
                The walk helped me reset.
                """);

        assertEquals("Morning reflection", result.title());
        assertEquals("I felt calm today.\nThe walk helped me reset.", result.content());
    }

    @Test
    void parse_supportsChineseMarkers() {
        AiDiarySummaryParser.ParsedSummary result = parser.parse("""
                标题：今日回顾
                内容：上午散步之后心情更稳定。
                """);

        assertEquals("今日回顾", result.title());
        assertEquals("上午散步之后心情更稳定。", result.content());
    }

    @Test
    void parse_fallsBackWhenMarkersAreMissing() {
        AiDiarySummaryParser.ParsedSummary result = parser.parse("这是一段没有固定格式的总结。");

        assertEquals("AI 对话总结", result.title());
        assertEquals("这是一段没有固定格式的总结。", result.content());
    }

    @Test
    void parse_truncatesToDiaryLimits() {
        AiDiarySummaryParser.ParsedSummary result = parser.parse(
                "TITLE: " + "t".repeat(300) + "\nCONTENT: " + "c".repeat(5100));

        assertEquals(255, result.title().length());
        assertEquals(5000, result.content().length());
    }
}
