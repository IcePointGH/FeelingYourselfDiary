package com.diaryproject.backend.schedule.controller;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.service.ScheduleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private static final Logger log = LoggerFactory.getLogger(ScheduleController.class);

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @PostMapping
    public ApiResponse<ScheduleDTO.Response> create(
            @Valid @RequestBody ScheduleDTO.CreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 创建日程请求");
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
    public ApiResponse<Page<ScheduleDTO.Response>> getAll(
            HttpServletRequest httpRequest,
            @PageableDefault(size = 20, sort = "date", direction = Sort.Direction.DESC) Pageable pageable) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        // Cap page size at 50 to prevent abuse
        if (pageable.getPageSize() > 50) {
            pageable = PageRequest.of(pageable.getPageNumber(), 50, pageable.getSort());
        }
        return ApiResponse.success(scheduleService.getAll(userId, pageable));
    }

    @PutMapping("/{id}")
    public ApiResponse<ScheduleDTO.Response> update(
            @PathVariable Long id,
            @Valid @RequestBody ScheduleDTO.UpdateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 更新日程 id: {}", id);
        return ApiResponse.success(scheduleService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 删除日程 id: {}", id);
        scheduleService.delete(userId, id);
        return ApiResponse.success();
    }
}
