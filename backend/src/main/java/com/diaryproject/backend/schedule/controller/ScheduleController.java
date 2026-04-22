package com.diaryproject.backend.schedule.controller;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.service.ScheduleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "http://localhost:3000")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @PostMapping
    public ApiResponse<ScheduleDTO.Response> create(
            @Valid @RequestBody ScheduleDTO.CreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(scheduleService.create(userId, request));
    }

    @GetMapping("/date/{date}")
    public ApiResponse<List<ScheduleDTO.Response>> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(scheduleService.getByDate(userId, date));
    }

    @GetMapping
    public ApiResponse<List<ScheduleDTO.Response>> getAll(HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(scheduleService.getAll(userId));
    }

    @PutMapping("/{id}")
    public ApiResponse<ScheduleDTO.Response> update(
            @PathVariable Long id,
            @Valid @RequestBody ScheduleDTO.UpdateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(scheduleService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        scheduleService.delete(userId, id);
        return ApiResponse.success();
    }
}
