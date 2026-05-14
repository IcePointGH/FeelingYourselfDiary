package com.diaryproject.backend.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 结构化报告 DTO — 包含报告对象、证据摘要等嵌套类型。
 */
public class StructuredReportDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StructuredReport {
        private String title;
        private Overview overview;
        private Trend trend;
        private List<Pattern> patterns;
        private List<TurningPoint> turningPoints;
        private List<Suggestion> suggestions;
        private String gentleNote;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private String headline;
        private String summary;
        private String tone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Trend {
        private String direction;
        private String volatility;
        private List<String> highlights;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pattern {
        private String title;
        private String description;
        private List<Long> scheduleIds;
        private List<Long> diaryIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TurningPoint {
        private String date;
        private String type;
        private String title;
        private String reason;
        private List<Long> scheduleIds;
        private List<Long> diaryIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Suggestion {
        private String title;
        private String action;
        private String difficulty;
        private List<Long> scheduleIds;
        private List<Long> diaryIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvidenceSummary {
        private List<ScheduleEvidence> schedules;
        private List<DiaryEvidence> diaries;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleEvidence {
        private Long id;
        private String date;
        private String time;
        private String title;
        private Integer feeling;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiaryEvidence {
        private Long id;
        private String date;
        private String title;
        private String excerpt;
    }
}
