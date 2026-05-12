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
        private String minimaxModel;
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
}
