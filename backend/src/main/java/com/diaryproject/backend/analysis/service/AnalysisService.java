package com.diaryproject.backend.analysis.service;

import com.diaryproject.backend.analysis.dto.AnalysisDTO;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.schedule.service.ScheduleService;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 分析服务，提供日记和日程的数据统计分析
 */
@Service
public class AnalysisService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleService scheduleService;

    public AnalysisService(ScheduleRepository scheduleRepository, ScheduleService scheduleService) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleService = scheduleService;
    }

    /** 获取指定日期的每日分析（情绪指数统计） */
    public AnalysisDTO.DailyResponse getDailyAnalysis(Long userId, LocalDate date) {
        List<ScheduleDTO.Response> items = scheduleService.getByDate(userId, date);
        return calculateDaily(items);
    }

    /** 获取指定日期所在周的统计，包含每日情绪指数 */
    public AnalysisDTO.WeeklyResponse getWeeklyAnalysis(Long userId, LocalDate date) {
        LocalDate start = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate end = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        List<ScheduleDTO.Response> items = scheduleService.getByDateRange(userId, start, end);
        return calculateWeekly(items, start, end);
    }

    /** 获取指定日期所在月的统计，包含每日情绪指数 */
    public AnalysisDTO.MonthlyResponse getMonthlyAnalysis(Long userId, LocalDate date) {
        LocalDate start = date.withDayOfMonth(1);
        LocalDate end = date.with(TemporalAdjusters.lastDayOfMonth());
        List<ScheduleDTO.Response> items = scheduleService.getByDateRange(userId, start, end);
        return calculateMonthly(items, start, end);
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

    private AnalysisDTO.WeeklyResponse calculateWeekly(List<ScheduleDTO.Response> items, LocalDate start, LocalDate end) {
        int total = items.stream().mapToInt(ScheduleDTO.Response::getFeeling).sum();
        int count = items.size();
        double avg = count > 0 ? (double) total / count : 0;

        Map<String, Integer> dailyTotals = new LinkedHashMap<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            final LocalDate currentDate = date;
            int dayTotal = items.stream()
                    .filter(i -> i.getDate().equals(currentDate))
                    .mapToInt(ScheduleDTO.Response::getFeeling)
                    .sum();
            dailyTotals.put(date.toString(), dayTotal);
        }

        AnalysisDTO.WeeklyResponse response = new AnalysisDTO.WeeklyResponse();
        response.setTotalFeeling(total);
        response.setItemCount(count);
        response.setAverageFeeling(Math.round(avg * 100.0) / 100.0);
        response.setDailyTotals(dailyTotals);
        response.setItems(items);
        return response;
    }

    private AnalysisDTO.MonthlyResponse calculateMonthly(List<ScheduleDTO.Response> items, LocalDate start, LocalDate end) {
        int total = items.stream().mapToInt(ScheduleDTO.Response::getFeeling).sum();
        int count = items.size();
        double avg = count > 0 ? (double) total / count : 0;

        Map<String, Integer> dailyTotals = new LinkedHashMap<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            final LocalDate currentDate = date;
            int dayTotal = items.stream()
                    .filter(i -> i.getDate().equals(currentDate))
                    .mapToInt(ScheduleDTO.Response::getFeeling)
                    .sum();
            dailyTotals.put(date.toString(), dayTotal);
        }

        AnalysisDTO.MonthlyResponse response = new AnalysisDTO.MonthlyResponse();
        response.setTotalFeeling(total);
        response.setItemCount(count);
        response.setAverageFeeling(Math.round(avg * 100.0) / 100.0);
        response.setDailyTotals(dailyTotals);
        response.setItems(items);
        return response;
    }
}
