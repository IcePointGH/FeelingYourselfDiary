package com.diaryproject.backend.diary;

import com.diaryproject.backend.common.cache.CacheKeys;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.diary.service.DiaryService;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DiaryService. Covers cache eviction, annotation verification, and exception handling.
 * Pure Mockito — no Spring context.
 */
class DiaryServiceExceptionTest {

    @Test
    void update_throwsResourceNotFoundException_whenDiaryNotFound() {
        DiaryRepository mockRepo = mock(DiaryRepository.class);
        CacheService mockCache = mock(CacheService.class);
        when(mockRepo.findByUserIdAndId(1L, 999L)).thenReturn(Optional.empty());

        DiaryService service = new DiaryService(mockRepo, mockCache);

        DiaryDTO.UpdateRequest request = new DiaryDTO.UpdateRequest();
        request.setTitle("Updated Title");
        request.setContent("Updated content");

        assertThrows(ResourceNotFoundException.class,
                () -> service.update(1L, 999L, request));
    }

    @Test
    void getByDate_hasCacheableAnnotation() throws Exception {
        Method m = DiaryService.class.getMethod("getByDate", Long.class, LocalDate.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
        assertEquals("diaries", ca.value()[0]);
    }

    @Test
    void create_evictsDiaryCacheForUser() {
        DiaryRepository mockRepo = mock(DiaryRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Diary mockDiary = mock(Diary.class);
        when(mockDiary.getUserId()).thenReturn(1L);
        when(mockDiary.getId()).thenReturn(1L);
        when(mockDiary.getTitle()).thenReturn("Test Title");
        when(mockDiary.getContent()).thenReturn("Test content");
        when(mockDiary.getDate()).thenReturn(LocalDate.of(2026, 4, 29));
        when(mockDiary.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockDiary.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.save(any(Diary.class))).thenReturn(mockDiary);

        DiaryService service = new DiaryService(mockRepo, mockCache);

        DiaryDTO.CreateRequest request = new DiaryDTO.CreateRequest();
        request.setTitle("Test Title");
        request.setContent("Test content");
        request.setDate(LocalDate.of(2026, 4, 29));

        service.create(1L, request);

        verify(mockCache).evictByPattern(CacheKeys.diaryPattern(1L));
    }

    @Test
    void update_evictsDiaryCacheForUser() {
        DiaryRepository mockRepo = mock(DiaryRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Diary mockDiary = mock(Diary.class);
        when(mockDiary.getUserId()).thenReturn(1L);
        when(mockDiary.getId()).thenReturn(1L);
        when(mockDiary.getTitle()).thenReturn("Test Title");
        when(mockDiary.getContent()).thenReturn("Test content");
        when(mockDiary.getDate()).thenReturn(LocalDate.of(2026, 4, 29));
        when(mockDiary.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockDiary.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.findByUserIdAndId(1L, 1L)).thenReturn(Optional.of(mockDiary));
        when(mockRepo.save(any(Diary.class))).thenReturn(mockDiary);

        DiaryService service = new DiaryService(mockRepo, mockCache);

        DiaryDTO.UpdateRequest request = new DiaryDTO.UpdateRequest();
        request.setTitle("Updated Title");
        request.setContent("Updated content");

        service.update(1L, 1L, request);

        verify(mockCache).evictByPattern(CacheKeys.diaryPattern(1L));
    }

    @Test
    void delete_evictsDiaryCacheForUser() {
        DiaryRepository mockRepo = mock(DiaryRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Diary mockDiary = mock(Diary.class);
        when(mockDiary.getUserId()).thenReturn(1L);
        when(mockRepo.findByUserIdAndId(1L, 1L)).thenReturn(Optional.of(mockDiary));

        DiaryService service = new DiaryService(mockRepo, mockCache);

        service.delete(1L, 1L);

        verify(mockCache).evictByPattern(CacheKeys.diaryPattern(1L));
    }

    @Test
    void create_returnsDiaryResponse() {
        DiaryRepository mockRepo = mock(DiaryRepository.class);
        CacheService mockCache = mock(CacheService.class);
        Diary mockDiary = mock(Diary.class);
        when(mockDiary.getUserId()).thenReturn(1L);
        when(mockDiary.getId()).thenReturn(1L);
        when(mockDiary.getTitle()).thenReturn("Test Title");
        when(mockDiary.getContent()).thenReturn("Test content");
        when(mockDiary.getDate()).thenReturn(LocalDate.of(2026, 4, 29));
        when(mockDiary.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(mockDiary.getUpdatedAt()).thenReturn(LocalDateTime.now());
        when(mockRepo.save(any(Diary.class))).thenReturn(mockDiary);

        DiaryService service = new DiaryService(mockRepo, mockCache);

        DiaryDTO.CreateRequest request = new DiaryDTO.CreateRequest();
        request.setTitle("Test Title");
        request.setContent("Test content");
        request.setDate(LocalDate.of(2026, 4, 29));

        DiaryDTO.Response response = service.create(1L, request);

        assertNotNull(response);
    }
}
