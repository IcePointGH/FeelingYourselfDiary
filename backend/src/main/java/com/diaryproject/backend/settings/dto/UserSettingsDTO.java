package com.diaryproject.backend.settings.dto;

import lombok.Data;

public class UserSettingsDTO {

    @Data
    public static class UpdateRequest {
        private String emotionLabels;
        private Boolean autoSaveThoughts;
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
