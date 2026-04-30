package com.diaryproject.backend.dto;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.settings.dto.UserSettingsDTO;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // ==================== ScheduleDTO.CreateRequest violations (6) ====================

    @Test
    void scheduleTitleNotBlank() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("");
        req.setDate(LocalDate.now());
        req.setFeeling(3);
        Set<ConstraintViolation<ScheduleDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "标题不能为空".equals(v.getMessage())));
    }

    @Test
    void scheduleTitleSize() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("x".repeat(256));
        req.setDate(LocalDate.now());
        req.setFeeling(3);
        Set<ConstraintViolation<ScheduleDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "标题最长255字符".equals(v.getMessage())));
    }

    @Test
    void scheduleDateNotNull() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("Test");
        req.setFeeling(3);
        Set<ConstraintViolation<ScheduleDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "日期不能为空".equals(v.getMessage())));
    }

    @Test
    void scheduleFeelingNotNull() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("Test");
        req.setDate(LocalDate.now());
        Set<ConstraintViolation<ScheduleDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "情绪值不能为空".equals(v.getMessage())));
    }

    @Test
    void scheduleFeelingMin() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("Test");
        req.setDate(LocalDate.now());
        req.setFeeling(-4);
        Set<ConstraintViolation<ScheduleDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "情绪值最小为-3".equals(v.getMessage())));
    }

    @Test
    void scheduleFeelingMax() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("Test");
        req.setDate(LocalDate.now());
        req.setFeeling(6);
        Set<ConstraintViolation<ScheduleDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "情绪值最大为3".equals(v.getMessage())));
    }

    // ==================== DiaryDTO.CreateRequest violations (5) ====================

    @Test
    void diaryTitleNotBlank() {
        DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
        req.setTitle("");
        req.setContent("content");
        req.setDate(LocalDate.now());
        Set<ConstraintViolation<DiaryDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "标题不能为空".equals(v.getMessage())));
    }

    @Test
    void diaryTitleSize() {
        DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
        req.setTitle("x".repeat(256));
        req.setContent("content");
        req.setDate(LocalDate.now());
        Set<ConstraintViolation<DiaryDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "标题最长255字符".equals(v.getMessage())));
    }

    @Test
    void diaryContentNotBlank() {
        DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
        req.setTitle("title");
        req.setContent("");
        req.setDate(LocalDate.now());
        Set<ConstraintViolation<DiaryDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "内容不能为空".equals(v.getMessage())));
    }

    @Test
    void diaryContentSize() {
        DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
        req.setTitle("title");
        req.setContent("x".repeat(5001));
        req.setDate(LocalDate.now());
        Set<ConstraintViolation<DiaryDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "内容最长5000字符".equals(v.getMessage())));
    }

    @Test
    void diaryDateNotNull() {
        DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
        req.setTitle("title");
        req.setContent("content");
        Set<ConstraintViolation<DiaryDTO.CreateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "日期不能为空".equals(v.getMessage())));
    }

    // ==================== UserSettingsDTO.UpdateRequest violations (1) ====================

    @Test
    void settingsThemePattern() {
        UserSettingsDTO.UpdateRequest req = new UserSettingsDTO.UpdateRequest();
        req.setTheme("invalid_theme");
        Set<ConstraintViolation<UserSettingsDTO.UpdateRequest>> violations = validator.validate(req);
        assertTrue(violations.stream().anyMatch(v -> "主题只能是 morandi 或 minimal".equals(v.getMessage())));
    }

    // ==================== All-valid tests (4) ====================

    @Test
    void scheduleCreateRequestAllValid() {
        ScheduleDTO.CreateRequest req = new ScheduleDTO.CreateRequest();
        req.setTitle("Valid Title");
        req.setDate(LocalDate.now());
        req.setFeeling(3);
        assertTrue(validator.validate(req).isEmpty());
    }

    @Test
    void diaryCreateRequestAllValid() {
        DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
        req.setTitle("Valid Title");
        req.setContent("Valid Content");
        req.setDate(LocalDate.now());
        assertTrue(validator.validate(req).isEmpty());
    }

    @Test
    void settingsUpdateRequestAllValid() {
        UserSettingsDTO.UpdateRequest req = new UserSettingsDTO.UpdateRequest();
        req.setTheme("morandi");
        assertTrue(validator.validate(req).isEmpty());
    }

    @Test
    void authRegisterRequestAllValid() {
        AuthDTO.RegisterRequest req = new AuthDTO.RegisterRequest();
        req.setUsername("testuser");
        req.setPassword("password123");
        req.setNickname("Test User");
        assertTrue(validator.validate(req).isEmpty());
    }
}
