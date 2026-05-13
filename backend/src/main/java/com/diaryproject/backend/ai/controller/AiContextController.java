package com.diaryproject.backend.ai.controller;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.service.AiContextService;
import com.diaryproject.backend.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiContextController {

    private static final Logger log = LoggerFactory.getLogger(AiContextController.class);

    private final AiContextService aiContextService;

    public AiContextController(AiContextService aiContextService) {
        this.aiContextService = aiContextService;
    }

    @GetMapping("/context/schedules")
    public ApiResponse<List<AiDTO.ScheduleSummary>> listSchedules(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("REST list AI context schedules - userId: {}", userId);
        return ApiResponse.success(aiContextService.listSchedules(userId));
    }

    @GetMapping("/context/diaries")
    public ApiResponse<List<AiDTO.DiarySummary>> listDiaries(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("REST list AI context diaries - userId: {}", userId);
        return ApiResponse.success(aiContextService.listDiaries(userId));
    }

    @PostMapping("/sessions/{sessionId}/context")
    public ApiResponse<AiDTO.ContextEntry> addContext(
            @PathVariable Long sessionId,
            @Valid @RequestBody AiDTO.AddContextRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST add AI context - userId: {}, sessionId: {}, scheduleId: {}, diaryId: {}",
                userId, sessionId, request.getScheduleId(), request.getDiaryId());
        return ApiResponse.success(aiContextService.addContext(userId, sessionId, request));
    }

    @DeleteMapping("/sessions/{sessionId}/context/{id}")
    public ApiResponse<Void> removeContext(
            @PathVariable Long sessionId,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST remove AI context - userId: {}, sessionId: {}, entryId: {}", userId, sessionId, id);
        aiContextService.removeContext(userId, sessionId, id);
        return ApiResponse.success();
    }

    @GetMapping("/sessions/{sessionId}/context")
    public ApiResponse<List<AiDTO.ContextEntry>> getContext(
            @PathVariable Long sessionId,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST get AI context - userId: {}, sessionId: {}", userId, sessionId);
        return ApiResponse.success(aiContextService.getContext(userId, sessionId));
    }
}
