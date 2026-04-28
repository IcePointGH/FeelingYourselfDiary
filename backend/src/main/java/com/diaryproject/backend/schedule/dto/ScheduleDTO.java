package com.diaryproject.backend.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

public class ScheduleDTO {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "标题不能为空")
        @Size(max = 255, message = "标题最长255字符")
        private String title;
        @Size(max = 2000, message = "描述最长2000字符")
        private String description;
        @NotNull(message = "日期不能为空")
        private LocalDate date;
        private LocalTime time;
        @NotNull(message = "情绪值不能为空")
        @Min(value = 1, message = "情绪值最小为1")
        @Max(value = 5, message = "情绪值最大为5")
        private Integer feeling;
    }

    @Data
    public static class UpdateRequest {
        @NotBlank(message = "标题不能为空")
        @Size(max = 255, message = "标题最长255字符")
        private String title;
        @Size(max = 2000, message = "描述最长2000字符")
        private String description;
        // Update can be partial: keep date as optional, matching Create as closely as possible without enforcing NotNull
        private LocalDate date;
        private LocalTime time;
        @Min(value = 1, message = "情绪值最小为1")
        @Max(value = 5, message = "情绪值最大为5")
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
