package com.diaryproject.backend.diary.controller;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.service.DiaryService;
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
@RequestMapping("/api/diaries")
public class DiaryController {

    private static final Logger log = LoggerFactory.getLogger(DiaryController.class);

    private final DiaryService diaryService;

    public DiaryController(DiaryService diaryService) {
        this.diaryService = diaryService;
    }

    @PostMapping
    public ApiResponse<DiaryDTO.Response> create(
            @Valid @RequestBody DiaryDTO.CreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 创建日记请求");
        return ApiResponse.success(diaryService.create(userId, request));
    }

    @GetMapping("/date/{date}")
    public ApiResponse<List<DiaryDTO.Response>> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(diaryService.getByDate(userId, date));
    }

    @GetMapping
    public ApiResponse<Page<DiaryDTO.Response>> getAll(
            HttpServletRequest httpRequest,
            @PageableDefault(size = 20, sort = "date", direction = Sort.Direction.DESC) Pageable pageable) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        // Cap page size at 50 to prevent abuse
        if (pageable.getPageSize() > 50) {
            pageable = PageRequest.of(pageable.getPageNumber(), 50, pageable.getSort());
        }
        return ApiResponse.success(diaryService.getAll(userId, pageable));
    }

    @PutMapping("/{id}")
    public ApiResponse<DiaryDTO.Response> update(
            @PathVariable Long id,
            @Valid @RequestBody DiaryDTO.UpdateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 更新日记 id: {}", id);
        return ApiResponse.success(diaryService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 删除日记 id: {}", id);
        diaryService.delete(userId, id);
        return ApiResponse.success();
    }
}
