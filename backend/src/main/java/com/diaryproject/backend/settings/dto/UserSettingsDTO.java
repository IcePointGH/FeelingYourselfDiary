package com.diaryproject.backend.settings.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class UserSettingsDTO {

    @Data
    public static class UpdateRequest {
        @Size(max = 2000, message = "情绪标签最长2000字符")
        private String emotionLabels;
        private Boolean autoSaveThoughts;
        @Pattern(regexp = "morandi|minimal", message = "主题只能是 morandi 或 minimal")
        private String theme;
    }

    @Data
    public static class Response {
        private Long id;
        private Long userId;
        private String emotionLabels;
        private Boolean autoSaveThoughts;
        private String theme;
    }
}
