package com.diaryproject.backend.ai.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * AI 模块 DTO
 */
public class AiDTO {

    @Data
    public static class TestPromptRequest {
        private String prompt;
    }

    @Data
    public static class TestPromptResponse {
        private String model;
        private String response;
        private String status;
    }

    @Data
    public static class HealthResponse {
        private String bigModel;
        private boolean chatModelReady;
        private String springAiVersion;
    }

    @Data
    public static class AnalyzeRequest {
        @NotNull(message = "开始日期不能为空")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate startDate;

        @NotNull(message = "结束日期不能为空")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate endDate;
    }

    @Data
    public static class AnalyzeResponse {
        private String markdown;
        private int scheduleCount;
        private int diaryCount;
        private String dateRange;
        private Boolean structured;
        private String schemaVersion;
        private Integer retryCount;
        private StructuredReportDTO.StructuredReport report;
        private StructuredReportDTO.EvidenceSummary evidenceSummary;
    }

    // ==================== Session DTOs ====================

    @Data
    public static class CreateSessionRequest {
        @NotNull(message = "会话标题不能为空")
        private String title;

        @NotNull(message = "会话类型不能为空")
        private String sessionType;
    }

    @Data
    public static class SessionResponse {
        private Long id;
        private String title;
        private String sessionType;
        private String status;
        private Integer progress;
        private String createdAt;
        private int messageCount;
        private Long diaryId;
        private java.util.List<MessageResponse> messages;
    }

    @Data
    public static class SessionListItem {
        private Long id;
        private String title;
        private String sessionType;
        private String status;
        private String createdAt;
        private int messageCount;
    }

    @Data
    public static class MessageResponse {
        private Long id;
        private String role;
        private String content;
        private Integer sequenceNum;
        private String createdAt;
    }

    @Data
    public static class ChatRequest {
        @NotNull(message = "消息不能为空")
        private String message;
    }

    @Data
    public static class RenameRequest {
        @NotNull(message = "标题不能为空")
        private String title;
    }

    // ==================== Context Picker DTOs ====================

    @Data
    public static class AddContextRequest {
        private Long scheduleId;
        private Long diaryId;
        private String tag;
    }

    @Data
    public static class ContextEntry {
        private Long id;           // AiSessionSchedule.id
        private Long scheduleId;
        private Long diaryId;
        private String date;       // date of the entry
        private String title;      // schedule/diary title
        private String tag;        // user label
        private Integer feeling;   // -3..+3, null for diaries
        private String type;       // "schedule" or "diary"
    }

    @Data
    public static class ScheduleSummary {
        private Long id;
        private String date;
        private String time;
        private String title;
        private Integer feeling;    // -3..+3
        private String description;
    }

    @Data
    public static class DiarySummary {
        private Long id;
        private String date;
        private String title;
        private String content;     // truncated to 50 chars for list view
    }

    // ==================== Summarize-to-Diary DTO ====================

    @Data
    public static class SummarizeResponse {
        private Long diaryId;
        private String diaryDate;
        private boolean updated; // true = updated existing diary, false = created new
    }
}
