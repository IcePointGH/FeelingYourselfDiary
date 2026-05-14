package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.StructuredReportDTO;
import com.diaryproject.backend.ai.exception.StructuredReportException;
import com.diaryproject.backend.ai.validation.StructuredReportValidator;

import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class StructuredReportParserTest {

    private final StructuredReportParser parser = new StructuredReportParser();
    private final StructuredReportValidator validator = new StructuredReportValidator();

    private static final Set<Long> VALID_SCHEDULE_IDS = Set.of(1L, 2L, 3L);
    private static final Set<Long> VALID_DIARY_IDS = Set.of(10L, 11L, 12L);
    private static final Set<Long> EMPTY_IDS = Collections.emptySet();

    // --- Helper: build a minimal valid report JSON ---
    private String validReportJson() {
        return """
                {
                  "title": "一周情绪回顾",
                  "overview": {
                    "headline": "整体情绪稳定",
                    "summary": "本周情绪总体平稳。",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low",
                    "highlights": ["每日情绪波动较小"]
                  },
                  "patterns": [
                    {
                      "title": "工作日压力",
                      "description": "工作日情绪偏低",
                      "scheduleIds": [1, 2],
                      "diaryIds": []
                    }
                  ],
                  "turningPoints": [
                    {
                      "date": "2026-05-10",
                      "type": "low",
                      "title": "周一低谷",
                      "reason": "工作量较大导致情绪下降",
                      "scheduleIds": [1],
                      "diaryIds": []
                    }
                  ],
                  "suggestions": [
                    {
                      "title": "适当休息",
                      "action": "每工作一小时休息五分钟",
                      "difficulty": "easy",
                      "scheduleIds": [],
                      "diaryIds": []
                    }
                  ],
                  "gentleNote": "你已经做得很好了，慢慢来 ❤️"
                }
                """;
    }

    // ============================================
    // Test 1: Valid JSON parses successfully
    // ============================================
    @Test
    void parseAndValidate_validJson_parsesSuccessfully() {
        StructuredReportDTO.StructuredReport report =
                parser.parseAndValidate(validReportJson(), VALID_SCHEDULE_IDS, VALID_DIARY_IDS);

        assertNotNull(report);
        assertEquals("一周情绪回顾", report.getTitle());
        assertNotNull(report.getOverview());
        assertEquals("stable", report.getOverview().getTone());
        assertNotNull(report.getTrend());
        assertEquals("flat", report.getTrend().getDirection());
        assertEquals(1, report.getPatterns().size());
        assertEquals(1, report.getTurningPoints().size());
        assertEquals(1, report.getSuggestions().size());
        assertEquals("你已经做得很好了，慢慢来 ❤️", report.getGentleNote());
    }

    // ============================================
    // Test 2: Malformed JSON fails
    // ============================================
    @Test
    void parseAndValidate_malformedJson_throwsException() {
        String malformed = "{ this is not json }";

        StructuredReportException ex = assertThrows(StructuredReportException.class,
                () -> parser.parseAndValidate(malformed, VALID_SCHEDULE_IDS, VALID_DIARY_IDS));
        assertTrue(ex.getMessage().contains("Failed to parse"), "Expected parse failure message");
    }

    // ============================================
    // Test 3: Missing required field (null title) fails
    // ============================================
    @Test
    void parseAndValidate_missingTitle_throwsException() {
        String json = """
                {
                  "overview": {
                    "headline": "整体情绪稳定",
                    "summary": "本周情绪总体平稳。",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low"
                  },
                  "suggestions": [
                    {
                      "title": "多运动",
                      "action": "每天散步30分钟",
                      "difficulty": "easy"
                    }
                  ],
                  "gentleNote": "加油"
                }
                """;

        StructuredReportException ex = assertThrows(StructuredReportException.class,
                () -> parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS));
        assertTrue(ex.getMessage().contains("report.title"), "Expected title validation error");
    }

    // ============================================
    // Test 4: Invalid enum (tone="angry") fails
    // ============================================
    @Test
    void parseAndValidate_invalidTone_throwsException() {
        String json = """
                {
                  "title": "测试",
                  "overview": {
                    "headline": "测试标题",
                    "summary": "测试摘要",
                    "tone": "angry"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low"
                  },
                  "suggestions": [
                    {
                      "title": "多运动",
                      "action": "每天散步30分钟",
                      "difficulty": "easy"
                    }
                  ],
                  "gentleNote": "加油"
                }
                """;

        StructuredReportException ex = assertThrows(StructuredReportException.class,
                () -> parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS));
        assertTrue(ex.getMessage().contains("overview.tone"), "Expected tone validation error, got: " + ex.getMessage());
    }

    // ============================================
    // Test 5: Field too long (headline > 80) fails
    // ============================================
    @Test
    void parseAndValidate_headlineTooLong_throwsException() {
        String longHeadline = "a".repeat(81);
        String json = """
                {
                  "title": "测试",
                  "overview": {
                    "headline": "%s",
                    "summary": "测试摘要",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low"
                  },
                  "suggestions": [
                    {
                      "title": "多运动",
                      "action": "每天散步30分钟",
                      "difficulty": "easy"
                    }
                  ],
                  "gentleNote": "加油"
                }
                """.formatted(longHeadline);

        StructuredReportException ex = assertThrows(StructuredReportException.class,
                () -> parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS));
        assertTrue(ex.getMessage().contains("overview.headline"), "Expected headline length error, got: " + ex.getMessage());
    }

    // ============================================
    // Test 6: Feeling out of range (5) fails
    // ============================================
    @Test
    void validateEvidence_feelingOutOfRange_fails() {
        StructuredReportDTO.ScheduleEvidence evidence = new StructuredReportDTO.ScheduleEvidence();
        evidence.setId(1L);
        evidence.setDate("2026-05-10");
        evidence.setTime("09:00");
        evidence.setTitle("测试日程");
        evidence.setFeeling(5); // out of range (-3 to 3)

        List<String> errors = validator.validateEvidenceSummary(
                List.of(evidence),
                Collections.emptyList());

        assertFalse(errors.isEmpty(), "Expected validation errors for feeling=5");
        assertTrue(errors.get(0).contains("feeling"), "Expected feeling error, got: " + errors);
    }

    // ============================================
    // Test 7: scheduleId not in valid set fails
    // ============================================
    @Test
    void parseAndValidate_scheduleIdNotInSet_throwsException() {
        String json = """
                {
                  "title": "测试",
                  "overview": {
                    "headline": "测试标题",
                    "summary": "测试摘要",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low"
                  },
                  "patterns": [
                    {
                      "title": "模式",
                      "description": "描述",
                      "scheduleIds": [999],
                      "diaryIds": []
                    }
                  ],
                  "suggestions": [
                    {
                      "title": "多运动",
                      "action": "每天散步30分钟",
                      "difficulty": "easy"
                    }
                  ],
                  "gentleNote": "加油"
                }
                """;

        StructuredReportException ex = assertThrows(StructuredReportException.class,
                () -> parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS));
        assertTrue(ex.getMessage().contains("scheduleIds"), "Expected scheduleIds error, got: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("999"), "Expected invalid id 999 in error, got: " + ex.getMessage());
    }

    // ============================================
    // Test 8: Duplicate IDs are deduplicated (allowed, no error)
    // ============================================
    @Test
    void parseAndValidate_duplicateIds_passes() {
        // The validator deduplicates and only checks existence, so duplicates are fine
        String json = """
                {
                  "title": "测试",
                  "overview": {
                    "headline": "测试标题",
                    "summary": "测试摘要",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low"
                  },
                  "patterns": [
                    {
                      "title": "模式",
                      "description": "描述",
                      "scheduleIds": [1, 1, 2, 2],
                      "diaryIds": [10, 10]
                    }
                  ],
                  "suggestions": [
                    {
                      "title": "多运动",
                      "action": "每天散步30分钟",
                      "difficulty": "easy"
                    }
                  ],
                  "gentleNote": "加油"
                }
                """;

        StructuredReportDTO.StructuredReport report =
                parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS);
        assertNotNull(report);
        assertEquals(1, report.getPatterns().size());
        // duplicate IDs are allowed — they just get deduplicated silently
        assertNotNull(report.getPatterns().get(0).getScheduleIds());
    }

    // ============================================
    // Test 9: Suggestions with 0 items fails (need 1-4)
    // ============================================
    @Test
    void parseAndValidate_zeroSuggestions_throwsException() {
        String json = """
                {
                  "title": "测试",
                  "overview": {
                    "headline": "测试标题",
                    "summary": "测试摘要",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low"
                  },
                  "suggestions": [],
                  "gentleNote": "加油"
                }
                """;

        StructuredReportException ex = assertThrows(StructuredReportException.class,
                () -> parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS));
        assertTrue(ex.getMessage().contains("suggestions"), "Expected suggestions error, got: " + ex.getMessage());
    }

    // ============================================
    // Test 10: All arrays at max size pass
    // ============================================
    @Test
    void parseAndValidate_arraysAtMaxSize_passes() {
        StringBuilder patterns = new StringBuilder("[");
        for (int i = 0; i < 4; i++) {
            if (i > 0) patterns.append(",");
            patterns.append("""
                    {
                      "title": "模式%s",
                      "description": "描述",
                      "scheduleIds": [1],
                      "diaryIds": []
                    }
                    """.formatted(i));
        }
        patterns.append("]");

        StringBuilder turningPoints = new StringBuilder("[");
        for (int i = 0; i < 5; i++) {
            if (i > 0) turningPoints.append(",");
            turningPoints.append("""
                    {
                      "date": "2026-05-%s",
                      "type": "low",
                      "title": "转折%s",
                      "reason": "原因%s",
                      "scheduleIds": [1],
                      "diaryIds": []
                    }
                    """.formatted(String.format("%02d", i + 1), i, i));
        }
        turningPoints.append("]");

        StringBuilder suggestions = new StringBuilder("[");
        for (int i = 0; i < 4; i++) {
            if (i > 0) suggestions.append(",");
            suggestions.append("""
                    {
                      "title": "建议%s",
                      "action": "行动%s",
                      "difficulty": "easy",
                      "scheduleIds": [],
                      "diaryIds": []
                    }
                    """.formatted(i, i));
        }
        suggestions.append("]");

        StringBuilder highlights = new StringBuilder("[");
        for (int i = 0; i < 4; i++) {
            if (i > 0) highlights.append(",");
            highlights.append("\"亮点%s\"".formatted(i));
        }
        highlights.append("]");

        String json = """
                {
                  "title": "测试",
                  "overview": {
                    "headline": "测试标题",
                    "summary": "测试摘要",
                    "tone": "stable"
                  },
                  "trend": {
                    "direction": "flat",
                    "volatility": "low",
                    "highlights": %s
                  },
                  "patterns": %s,
                  "turningPoints": %s,
                  "suggestions": %s,
                  "gentleNote": "加油"
                }
                """.formatted(highlights.toString(), patterns.toString(), turningPoints.toString(), suggestions.toString());

        StructuredReportDTO.StructuredReport report =
                parser.parseAndValidate(json, VALID_SCHEDULE_IDS, VALID_DIARY_IDS);
        assertNotNull(report);
        assertEquals(4, report.getPatterns().size());
        assertEquals(5, report.getTurningPoints().size());
        assertEquals(4, report.getSuggestions().size());
        assertEquals(4, report.getTrend().getHighlights().size());
    }

    // ============================================
    // Additional: extractJson tests
    // ============================================
    @Test
    void extractJson_stripsMarkdownCodeBlock() {
        String input = """
                ```json
                {"key": "value"}
                ```
                """;
        String result = parser.extractJson(input);
        assertEquals("{\"key\": \"value\"}", result);
    }

    @Test
    void extractJson_findsBraceDelimitedJson() {
        String input = "Here is your report: {\"key\": \"value\"} Enjoy!";
        String result = parser.extractJson(input);
        assertEquals("{\"key\": \"value\"}", result);
    }

    @Test
    void extractJson_returnsTrimmedIfNoBraces() {
        String input = "  plain text  ";
        String result = parser.extractJson(input);
        assertEquals("plain text", result);
    }
}
