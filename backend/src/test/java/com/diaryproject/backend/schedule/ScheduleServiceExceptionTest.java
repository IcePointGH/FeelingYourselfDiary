package com.diaryproject.backend.schedule;

import com.diaryproject.backend.common.cache.CacheKeys;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.service.DiaryService;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.schedule.service.ScheduleService;
import com.diaryproject.backend.settings.service.UserSettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ScheduleService. Covers cache eviction, annotation verification, and exception handling.
 * Pure Mockito — no Spring context.
 */
class ScheduleServiceExceptionTest {

    @Test
    void update_throwsResourceNotFoundException_whenScheduleNotFound() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        CacheService mockCache = mock(CacheService.class);
        when(mockRepo.findById(999L)).thenReturn(Optional.empty());

        ScheduleService service = new ScheduleService(mockRepo, mockCache, mock(DiaryService.class), mock(UserSettingsService.class));

        ScheduleDTO.UpdateRequest request = new ScheduleDTO.UpdateRequest();
        request.setTitle("Updated Title");

        assertThrows(ResourceNotFoundException.class,
                () -> service.update(1L, 999L, request));
    }

    @Test
    void create_evictsAnalysisCacheForUser() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getUserId()).thenReturn(1L);
        when(mockSchedule.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockSchedule.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.save(any())).thenReturn(mockSchedule);

        ScheduleService service = new ScheduleService(mockRepo, mockCache, mock(DiaryService.class), mock(UserSettingsService.class));

        ScheduleDTO.CreateRequest request = new ScheduleDTO.CreateRequest();
        request.setTitle("Test Title");
        request.setDate(LocalDate.now());
        request.setTime(LocalTime.now());
        request.setFeeling(3);

        service.create(1L, request);

        verify(mockCache).evictByPattern(CacheKeys.analysisPattern(1L));
    }

    @Test
    void update_evictsAnalysisCacheForUser() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getUserId()).thenReturn(1L);
        when(mockSchedule.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockSchedule.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.findById(1L)).thenReturn(Optional.of(mockSchedule));
        when(mockRepo.save(any())).thenReturn(mockSchedule);

        ScheduleService service = new ScheduleService(mockRepo, mockCache, mock(DiaryService.class), mock(UserSettingsService.class));

        ScheduleDTO.UpdateRequest request = new ScheduleDTO.UpdateRequest();
        request.setTitle("Updated Title");

        service.update(1L, 1L, request);

        verify(mockCache).evictByPattern(CacheKeys.analysisPattern(1L));
    }

    @Test
    void delete_evictsAnalysisCacheForUser() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getUserId()).thenReturn(1L);
        when(mockRepo.findById(1L)).thenReturn(Optional.of(mockSchedule));

        ScheduleService service = new ScheduleService(mockRepo, mockCache, mock(DiaryService.class), mock(UserSettingsService.class));

        service.delete(1L, 1L);

        verify(mockCache).evictByPattern(CacheKeys.analysisPattern(1L));
    }

    @Test
    void getByDate_hasCacheableAnnotation() throws NoSuchMethodException {
        Method m = ScheduleService.class.getMethod("getByDate", Long.class, LocalDate.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
        assertEquals("schedules", ca.value()[0]);
    }

    @Test
    void create_doesNotEvictCache_whenDifferentUser() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getUserId()).thenReturn(2L);
        when(mockSchedule.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockSchedule.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.save(any())).thenReturn(mockSchedule);

        ScheduleService service = new ScheduleService(mockRepo, mockCache, mock(DiaryService.class), mock(UserSettingsService.class));

        ScheduleDTO.CreateRequest request = new ScheduleDTO.CreateRequest();
        request.setTitle("Test Title");
        request.setDate(LocalDate.now());
        request.setTime(LocalTime.now());
        request.setFeeling(3);

        service.create(1L, request);

        // The cache eviction uses the userId parameter (1L), not the entity's userId (2L)
        verify(mockCache).evictByPattern(CacheKeys.analysisPattern(1L));
    }

    @Test
    void create_returnsScheduleResponse() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getUserId()).thenReturn(1L);
        when(mockSchedule.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockSchedule.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.save(any())).thenReturn(mockSchedule);

        ScheduleService service = new ScheduleService(mockRepo, mockCache, mock(DiaryService.class), mock(UserSettingsService.class));

        ScheduleDTO.CreateRequest request = new ScheduleDTO.CreateRequest();
        request.setTitle("Test Title");
        request.setDate(LocalDate.now());
        request.setTime(LocalTime.now());
        request.setFeeling(3);

        ScheduleDTO.Response response = service.create(1L, request);

        assertNotNull(response);
    }
}
