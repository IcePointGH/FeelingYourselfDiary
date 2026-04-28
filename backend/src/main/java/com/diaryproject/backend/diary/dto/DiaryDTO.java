package com.diaryproject.backend.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

public class DiaryDTO {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "标题不能为空")
        @Size(max = 255, message = "标题最长255字符")
        private String title;
        @NotBlank(message = "内容不能为空")
        @Size(max = 5000, message = "内容最长5000字符")
        private String content;
        @NotNull(message = "日期不能为空")
        private LocalDate date;
    }

    @Data
    public static class UpdateRequest {
        @NotBlank(message = "标题不能为空")
        @Size(max = 255, message = "标题最长255字符")
        private String title;
        @NotBlank(message = "内容不能为空")
        @Size(max = 5000, message = "内容最长5000字符")
        private String content;
        // Optional in update: do not enforce non-null date
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
