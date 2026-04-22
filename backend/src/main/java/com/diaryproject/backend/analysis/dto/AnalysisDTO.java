package com.diaryproject.backend.analysis.dto;

import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import lombok.Data;

import java.util.List;
import java.util.Map;

public class AnalysisDTO {

    @Data
    public static class DailyResponse {
        private int totalFeeling;
        private int itemCount;
        private double averageFeeling;
        private List<ScheduleDTO.Response> items;
    }

    @Data
    public static class WeeklyResponse {
        private int totalFeeling;
        private int itemCount;
        private double averageFeeling;
        private Map<String, Integer> dailyTotals;
        private List<ScheduleDTO.Response> items;
    }

    @Data
    public static class MonthlyResponse {
        private int totalFeeling;
        private int itemCount;
        private double averageFeeling;
        private Map<String, Integer> dailyTotals;
        private List<ScheduleDTO.Response> items;
    }
}
