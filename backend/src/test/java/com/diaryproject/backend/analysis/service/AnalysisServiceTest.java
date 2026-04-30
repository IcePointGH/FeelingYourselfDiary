package com.diaryproject.backend.analysis.service;

import com.diaryproject.backend.analysis.dto.AnalysisDTO;
import com.diaryproject.backend.analysis.dto.DateFeelingTotal;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.schedule.service.ScheduleService;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AnalysisService caching and behavior. Pure Mockito — no Spring context.
 */
class AnalysisServiceTest {

    @Test
    void getDailyAnalysis_hasCacheableAnnotation() throws Exception {
        Method m = AnalysisService.class.getMethod("getDailyAnalysis", Long.class, LocalDate.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
        assertEquals("analysis", ca.value()[0]);
    }

    @Test
    void getWeeklyAnalysis_hasCacheableAnnotation() throws Exception {
        Method m = AnalysisService.class.getMethod("getWeeklyAnalysis", Long.class, LocalDate.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
        assertEquals("analysis", ca.value()[0]);
    }

    @Test
    void getMonthlyAnalysis_hasCacheableAnnotation() throws Exception {
        Method m = AnalysisService.class.getMethod("getMonthlyAnalysis", Long.class, LocalDate.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
        assertEquals("analysis", ca.value()[0]);
    }

    @Test
    void getDailyAnalysis_returnsDailyResponse() {
        ScheduleRepository repo = mock(ScheduleRepository.class);
        ScheduleService scheduleService = mock(ScheduleService.class);
        AnalysisService service = new AnalysisService(repo, scheduleService);

        when(scheduleService.getByDate(anyLong(), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        LocalDate date = LocalDate.of(2024, 1, 1);
        AnalysisDTO.DailyResponse response = service.getDailyAnalysis(1L, date);

        assertNotNull(response);
        assertNotNull(response.getItems());
        assertTrue(response.getItems().isEmpty());
    }

    @Test
    void getWeeklyAnalysis_returnsWeeklyResponse() {
        ScheduleRepository repo = mock(ScheduleRepository.class);
        ScheduleService scheduleService = mock(ScheduleService.class);
        AnalysisService service = new AnalysisService(repo, scheduleService);

        when(scheduleService.getByDateRange(anyLong(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(repo.findDailyFeelingTotalsByUserIdAndDateBetween(
                anyLong(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        LocalDate date = LocalDate.of(2024, 1, 1);
        AnalysisDTO.WeeklyResponse response = service.getWeeklyAnalysis(1L, date);

        assertNotNull(response);
    }

    @Test
    void getMonthlyAnalysis_returnsMonthlyResponse() {
        ScheduleRepository repo = mock(ScheduleRepository.class);
        ScheduleService scheduleService = mock(ScheduleService.class);
        AnalysisService service = new AnalysisService(repo, scheduleService);

        when(scheduleService.getByDateRange(anyLong(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(repo.findDailyFeelingTotalsByUserIdAndDateBetween(
                anyLong(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        LocalDate date = LocalDate.of(2024, 1, 15);
        AnalysisDTO.MonthlyResponse response = service.getMonthlyAnalysis(1L, date);

        assertNotNull(response);
    }

    @Test
    void getDailyAnalysis_includesFeelingTotals_whenDataExists() {
        ScheduleRepository repo = mock(ScheduleRepository.class);
        ScheduleService scheduleService = mock(ScheduleService.class);
        AnalysisService service = new AnalysisService(repo, scheduleService);

        ScheduleDTO.Response item = new ScheduleDTO.Response();
        item.setFeeling(3);
        item.setDate(LocalDate.of(2024, 1, 1));

        when(scheduleService.getByDate(anyLong(), any(LocalDate.class)))
                .thenReturn(List.of(item));

        AnalysisDTO.DailyResponse response = service.getDailyAnalysis(1L, LocalDate.of(2024, 1, 1));

        assertEquals(3, response.getTotalFeeling());
    }
}
