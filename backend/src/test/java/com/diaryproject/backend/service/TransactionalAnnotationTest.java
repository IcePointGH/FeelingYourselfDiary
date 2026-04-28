package com.diaryproject.backend.service;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.service.AuthService;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.service.DiaryService;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.service.ScheduleService;
import com.diaryproject.backend.settings.dto.UserSettingsDTO;
import com.diaryproject.backend.settings.service.UserSettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class TransactionalAnnotationTest {

    // ========== ScheduleService ==========

    @Test
    void scheduleServiceCreateHasTransactional() throws Exception {
        Method m = ScheduleService.class.getMethod("create", Long.class, ScheduleDTO.CreateRequest.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "create should have @Transactional");
    }

    @Test
    void scheduleServiceUpdateHasTransactional() throws Exception {
        Method m = ScheduleService.class.getMethod("update", Long.class, Long.class, ScheduleDTO.UpdateRequest.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "update should have @Transactional");
    }

    @Test
    void scheduleServiceDeleteHasTransactional() throws Exception {
        Method m = ScheduleService.class.getMethod("delete", Long.class, Long.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "delete should have @Transactional");
    }

    // ========== DiaryService ==========

    @Test
    void diaryServiceCreateHasTransactional() throws Exception {
        Method m = DiaryService.class.getMethod("create", Long.class, DiaryDTO.CreateRequest.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "create should have @Transactional");
    }

    @Test
    void diaryServiceUpdateHasTransactional() throws Exception {
        Method m = DiaryService.class.getMethod("update", Long.class, Long.class, DiaryDTO.UpdateRequest.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "update should have @Transactional");
    }

    @Test
    void diaryServiceDeleteHasTransactional() throws Exception {
        Method m = DiaryService.class.getMethod("delete", Long.class, Long.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "delete should have @Transactional");
    }

    // ========== AuthService ==========

    @Test
    void authServiceRegisterHasTransactional() throws Exception {
        Method m = AuthService.class.getMethod("register", AuthDTO.RegisterRequest.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "register should have @Transactional");
    }

    // ========== UserSettingsService ==========

    @Test
    void userSettingsServiceUpdateSettingsHasTransactional() throws Exception {
        Method m = UserSettingsService.class.getMethod("updateSettings", Long.class, UserSettingsDTO.UpdateRequest.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "updateSettings should have @Transactional");
    }

    @Test
    void userSettingsServiceClearDataHasTransactional() throws Exception {
        Method m = UserSettingsService.class.getMethod("clearData", Long.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "clearData should have @Transactional");
    }

    @Test
    void userSettingsServiceCreateDefaultSettingsHasTransactional() throws Exception {
        Method m = UserSettingsService.class.getDeclaredMethod("createDefaultSettings", Long.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx, "createDefaultSettings should have @Transactional");
    }

    // ========== readOnly tests ==========

    @Test
    void scheduleServiceGetAllReadOnly() throws Exception {
        Method m = ScheduleService.class.getMethod("getAll", Long.class, Pageable.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }

    @Test
    void scheduleServiceGetByDateReadOnly() throws Exception {
        Method m = ScheduleService.class.getMethod("getByDate", Long.class, LocalDate.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }

    @Test
    void scheduleServiceGetByDateRangeReadOnly() throws Exception {
        Method m = ScheduleService.class.getMethod("getByDateRange", Long.class, LocalDate.class, LocalDate.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }

    @Test
    void diaryServiceGetAllReadOnly() throws Exception {
        Method m = DiaryService.class.getMethod("getAll", Long.class, Pageable.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }

    @Test
    void diaryServiceGetByDateReadOnly() throws Exception {
        Method m = DiaryService.class.getMethod("getByDate", Long.class, LocalDate.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }

    @Test
    void settingsServiceGetSettingsReadOnly() throws Exception {
        Method m = UserSettingsService.class.getMethod("getSettings", Long.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }

    @Test
    void authServiceGetUserInfoReadOnly() throws Exception {
        Method m = AuthService.class.getMethod("getUserInfo", Long.class);
        Transactional tx = m.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertTrue(tx.readOnly());
    }
}
