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
        assertEquals("settings", ca.value()[0]);
    }

    @Test
    void updateSettings_hasCacheEvictAnnotation() throws Exception {
        Method m = UserSettingsService.class.getMethod("updateSettings", Long.class, UserSettingsDTO.UpdateRequest.class);
        CacheEvict ce = m.getAnnotation(CacheEvict.class);
        assertNotNull(ce);
        assertEquals("settings", ce.value()[0]);
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
        when(userSettingsRepository.findByUserId(1L)).thenReturn(Optional.of(mockSettings));

        UserSettingsService service = new UserSettingsService(userSettingsRepository, cacheService);
        UserSettingsDTO.Response response = service.getSettings(1L);

        assertNotNull(response);
        assertEquals("morandi", response.getTheme());
    }

    @Test
    void getSettings_returnsSettingsResponse_whenSettingsNotFound() {
        UserSettingsRepository userSettingsRepository = mock(UserSettingsRepository.class);
        CacheService cacheService = mock(CacheService.class);
        UserSettings mockSettings = mock(UserSettings.class);
        when(mockSettings.getTheme()).thenReturn("morandi");
        when(mockSettings.getAutoSaveThoughts()).thenReturn(false);
        when(userSettingsRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(userSettingsRepository.save(any(UserSettings.class))).thenReturn(mockSettings);

        UserSettingsService service = new UserSettingsService(userSettingsRepository, cacheService);
        UserSettingsDTO.Response response = service.getSettings(1L);

        assertNotNull(response);
        assertEquals("morandi", response.getTheme());
        verify(userSettingsRepository).save(any(UserSettings.class));
    }
}
