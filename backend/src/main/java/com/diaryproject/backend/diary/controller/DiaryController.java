package com.diaryproject.backend.diary.controller;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.service.DiaryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/diaries")
@CrossOrigin(origins = "http://localhost:3000")
public class DiaryController {

    private final DiaryService diaryService;

    public DiaryController(DiaryService diaryService) {
        this.diaryService = diaryService;
    }

    @PostMapping
    public ApiResponse<DiaryDTO.Response> create(
            @Valid @RequestBody DiaryDTO.CreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
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
    public ApiResponse<List<DiaryDTO.Response>> getAll(HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(diaryService.getAll(userId));
    }

    @PutMapping("/{id}")
    public ApiResponse<DiaryDTO.Response> update(
            @PathVariable Long id,
            @Valid @RequestBody DiaryDTO.UpdateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(diaryService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        diaryService.delete(userId, id);
        return ApiResponse.success();
    }
}
