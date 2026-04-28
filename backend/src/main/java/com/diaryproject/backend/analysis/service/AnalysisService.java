package com.diaryproject.backend.analysis.service;

import com.diaryproject.backend.analysis.dto.AnalysisDTO;
import com.diaryproject.backend.analysis.dto.DateFeelingTotal;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.schedule.service.ScheduleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 分析服务，提供日记和日程的数据统计分析
 */
@Service
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    private final ScheduleRepository scheduleRepository;
    private final ScheduleService scheduleService;

    public AnalysisService(ScheduleRepository scheduleRepository, ScheduleService scheduleService) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleService = scheduleService;
    }

    /** 获取指定日期的每日分析（情绪指数统计） */
    public AnalysisDTO.DailyResponse getDailyAnalysis(Long userId, LocalDate date) {
        log.debug("用户 {} 查询日情绪分析", userId);
        List<ScheduleDTO.Response> items = scheduleService.getByDate(userId, date);
        return calculateDaily(items);
    }

    /** 获取指定日期所在周的统计，包含每日情绪指数 */
    public AnalysisDTO.WeeklyResponse getWeeklyAnalysis(Long userId, LocalDate date) {
        log.debug("用户 {} 查询周情绪分析", userId);
        LocalDate start = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate end = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        List<ScheduleDTO.Response> items = scheduleService.getByDateRange(userId, start, end);

        int total = items.stream().mapToInt(ScheduleDTO.Response::getFeeling).sum();
        int count = items.size();
        double avg = count > 0 ? (double) total / count : 0;

        // DB-level GROUP BY aggregation replaces in-memory O(days × items) loop
        Map<String, Integer> dailyTotals = buildDailyTotals(userId, start, end);

        AnalysisDTO.WeeklyResponse response = new AnalysisDTO.WeeklyResponse();
        response.setTotalFeeling(total);
        response.setItemCount(count);
        response.setAverageFeeling(Math.round(avg * 100.0) / 100.0);
        response.setDailyTotals(dailyTotals);
        response.setItems(items);
        return response;
    }

    /** 获取指定日期所在月的统计，包含每日情绪指数 */
    public AnalysisDTO.MonthlyResponse getMonthlyAnalysis(Long userId, LocalDate date) {
        log.debug("用户 {} 查询月情绪分析", userId);
        LocalDate start = date.withDayOfMonth(1);
        LocalDate end = date.with(TemporalAdjusters.lastDayOfMonth());
        List<ScheduleDTO.Response> items = scheduleService.getByDateRange(userId, start, end);

        int total = items.stream().mapToInt(ScheduleDTO.Response::getFeeling).sum();
        int count = items.size();
        double avg = count > 0 ? (double) total / count : 0;

        // DB-level GROUP BY aggregation replaces in-memory O(days × items) loop
        Map<String, Integer> dailyTotals = buildDailyTotals(userId, start, end);

        AnalysisDTO.MonthlyResponse response = new AnalysisDTO.MonthlyResponse();
        response.setTotalFeeling(total);
        response.setItemCount(count);
        response.setAverageFeeling(Math.round(avg * 100.0) / 100.0);
        response.setDailyTotals(dailyTotals);
        response.setItems(items);
        return response;
    }

    /**
     * Build dailyTotals map using a DB GROUP BY aggregation query.
     * Initializes all dates in [start, end] to zero, then fills in
     * actual sums from the query result.
     */
    private Map<String, Integer> buildDailyTotals(Long userId, LocalDate start, LocalDate end) {
        Map<String, Integer> dailyTotals = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            dailyTotals.put(d.toString(), 0);
        }
        List<DateFeelingTotal> totals = scheduleRepository.findDailyFeelingTotalsByUserIdAndDateBetween(userId, start, end);
        for (DateFeelingTotal dft : totals) {
            dailyTotals.put(dft.getDate().toString(), dft.getTotalFeeling().intValue());
        }
        return dailyTotals;
    }

    private AnalysisDTO.DailyResponse calculateDaily(List<ScheduleDTO.Response> items) {
        int total = items.stream().mapToInt(ScheduleDTO.Response::getFeeling).sum();
        int count = items.size();
        double avg = count > 0 ? (double) total / count : 0;

        AnalysisDTO.DailyResponse response = new AnalysisDTO.DailyResponse();
        response.setTotalFeeling(total);
        response.setItemCount(count);
        response.setAverageFeeling(Math.round(avg * 100.0) / 100.0);
        response.setItems(items);
        return response;
    }
}
