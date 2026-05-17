package com.diaryproject.backend.settings.service;

import com.diaryproject.backend.common.cache.CacheKeys;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.settings.dto.UserSettingsDTO;
import com.diaryproject.backend.settings.entity.UserSettings;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.lang.reflect.Method;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserSettingsService caching and behavior.
 * Pure Mockito — no Spring context.
 */
class UserSettingsServiceTest {

    @Test
    void getSettings_hasCacheableAnnotation() throws Exception {
        Method m = UserSettingsService.class.getMethod("getSettings", Long.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
        assertEquals("settingsV2", ca.value()[0]);
    }

    @Test
    void updateSettings_hasCacheEvictAnnotation() throws Exception {
        Method m = UserSettingsService.class.getMethod("updateSettings", Long.class, UserSettingsDTO.UpdateRequest.class);
        CacheEvict ce = m.getAnnotation(CacheEvict.class);
        assertNotNull(ce);
        assertEquals("settingsV2", ce.value()[0]);
    }

    @Test
    void clearData_hasCacheEvictAnnotation() throws Exception {
        Method m = UserSettingsService.class.getMethod("clearData", Long.class);
        CacheEvict ce = m.getAnnotation(CacheEvict.class);
        assertNotNull(ce);
    }

    @Test
    void getSettings_returnsSettingsResponse_whenSettingsExist() {
        UserSettingsRepository userSettingsRepository = mock(UserSettingsRepository.class);
        CacheService cacheService = mock(CacheService.class);
        UserSettings mockSettings = mock(UserSettings.class);
        when(mockSettings.getTheme()).thenReturn("morandi");
        when(mockSettings.getAutoSaveThoughts()).thenReturn(false);
        when(mockSettings.getOnboardingHasCreatedSchedule()).thenReturn(true);
        when(mockSettings.getOnboardingHasCreatedDiary()).thenReturn(false);
        when(mockSettings.getOnboardingHasViewedAnalysis()).thenReturn(false);
        when(mockSettings.getOnboardingDismissed()).thenReturn(false);
        when(mockSettings.getOnboardingCompleted()).thenReturn(false);
        when(mockSettings.getOnboardingCompletionAcknowledged()).thenReturn(false);
        when(userSettingsRepository.findByUserId(1L)).thenReturn(Optional.of(mockSettings));

        UserSettingsService service = new UserSettingsService(userSettingsRepository, cacheService);
        UserSettingsDTO.Response response = service.getSettings(1L);

        assertNotNull(response);
        assertEquals("morandi", response.getTheme());
        assertTrue(response.getOnboardingHasCreatedSchedule());
        assertFalse(response.getOnboardingHasCreatedDiary());
    }

    @Test
    void getSettings_returnsSettingsResponse_whenSettingsNotFound() {
        UserSettingsRepository userSettingsRepository = mock(UserSettingsRepository.class);
        CacheService cacheService = mock(CacheService.class);
        UserSettings mockSettings = mock(UserSettings.class);
        when(mockSettings.getTheme()).thenReturn("morandi");
        when(mockSettings.getAutoSaveThoughts()).thenReturn(false);
        when(mockSettings.getOnboardingHasCreatedSchedule()).thenReturn(false);
        when(mockSettings.getOnboardingHasCreatedDiary()).thenReturn(false);
        when(mockSettings.getOnboardingHasViewedAnalysis()).thenReturn(false);
        when(mockSettings.getOnboardingDismissed()).thenReturn(false);
        when(mockSettings.getOnboardingCompleted()).thenReturn(false);
        when(mockSettings.getOnboardingCompletionAcknowledged()).thenReturn(false);
        when(userSettingsRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(userSettingsRepository.save(any(UserSettings.class))).thenReturn(mockSettings);

        UserSettingsService service = new UserSettingsService(userSettingsRepository, cacheService);
        UserSettingsDTO.Response response = service.getSettings(1L);

        assertNotNull(response);
        assertEquals("morandi", response.getTheme());
        assertFalse(response.getOnboardingCompleted());
        verify(userSettingsRepository).save(any(UserSettings.class));
    }

    @Test
    void updateSettings_updatesOnboardingFields_whenProvided() {
        UserSettingsRepository userSettingsRepository = mock(UserSettingsRepository.class);
        CacheService cacheService = mock(CacheService.class);
        UserSettings settings = new UserSettings();
        settings.setUserId(1L);
        settings.setTheme("morandi");
        settings.setAutoSaveThoughts(false);
        settings.setOnboardingHasCreatedSchedule(false);
        settings.setOnboardingHasCreatedDiary(false);
        settings.setOnboardingHasViewedAnalysis(false);
        settings.setOnboardingDismissed(false);
        settings.setOnboardingCompleted(false);
        settings.setOnboardingCompletionAcknowledged(false);
        when(userSettingsRepository.findByUserId(1L)).thenReturn(Optional.of(settings));
        when(userSettingsRepository.save(any(UserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserSettingsDTO.UpdateRequest request = new UserSettingsDTO.UpdateRequest();
        request.setOnboardingHasCreatedSchedule(true);
        request.setOnboardingHasCreatedDiary(true);
        request.setOnboardingHasViewedAnalysis(true);
        request.setOnboardingDismissed(true);
        request.setOnboardingCompleted(true);
        request.setOnboardingCompletionAcknowledged(true);

        UserSettingsService service = new UserSettingsService(userSettingsRepository, cacheService);
        UserSettingsDTO.Response response = service.updateSettings(1L, request);

        assertTrue(response.getOnboardingHasCreatedSchedule());
        assertTrue(response.getOnboardingHasCreatedDiary());
        assertTrue(response.getOnboardingHasViewedAnalysis());
        assertTrue(response.getOnboardingDismissed());
        assertTrue(response.getOnboardingCompleted());
        assertTrue(response.getOnboardingCompletionAcknowledged());
    }
}
