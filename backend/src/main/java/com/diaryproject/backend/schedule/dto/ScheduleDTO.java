package com.diaryproject.backend.schedule.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

public class ScheduleDTO {

    @Data
    public static class CreateRequest {
        private String title;
        private String description;
        private LocalDate date;
        private LocalTime time;
        private Integer feeling;
    }

    @Data
    public static class UpdateRequest {
        private String title;
        private String description;
        private LocalDate date;
        private LocalTime time;
        private Integer feeling;
    }

    @Data
    public static class Response {
        private Long id;
        private String title;
        private String description;
        private LocalDate date;
        private LocalTime time;
        private Integer feeling;
        private String createdAt;
        private String updatedAt;
    }
}
