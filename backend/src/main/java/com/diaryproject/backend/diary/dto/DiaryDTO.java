package com.diaryproject.backend.diary.dto;

import lombok.Data;

import java.time.LocalDate;

public class DiaryDTO {

    @Data
    public static class CreateRequest {
        private String title;
        private String content;
        private LocalDate date;
    }

    @Data
    public static class UpdateRequest {
        private String title;
        private String content;
        private LocalDate date;
    }

    @Data
    public static class Response {
        private Long id;
        private String title;
        private String content;
        private LocalDate date;
        private String createdAt;
        private String updatedAt;
    }
}
