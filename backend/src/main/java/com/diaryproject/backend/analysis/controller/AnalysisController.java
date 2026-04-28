package com.diaryproject.backend.analysis.controller;

import com.diaryproject.backend.analysis.dto.AnalysisDTO;
import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.analysis.service.AnalysisService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping("/daily")
    public ApiResponse<AnalysisDTO.DailyResponse> getDailyAnalysis(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(analysisService.getDailyAnalysis(userId, date));
    }

    @GetMapping("/weekly")
    public ApiResponse<AnalysisDTO.WeeklyResponse> getWeeklyAnalysis(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(analysisService.getWeeklyAnalysis(userId, date));
    }

    @GetMapping("/monthly")
    public ApiResponse<AnalysisDTO.MonthlyResponse> getMonthlyAnalysis(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") String month,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        LocalDate date = LocalDate.parse(month + "-01");
        return ApiResponse.success(analysisService.getMonthlyAnalysis(userId, date));
    }
}
