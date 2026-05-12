package com.diaryproject.backend.ai.controller;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * AI 上下文选择控制器 — 允许用户在聊天时选取日程/日记作为 AI 分析上下文
 */
@RestController
@RequestMapping("/api/ai")
public class AiContextController {

    private static final Logger log = LoggerFactory.getLogger(AiContextController.class);

    private final AiSessionScheduleRepository aiSessionScheduleRepository;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;

    public AiContextController(AiSessionScheduleRepository aiSessionScheduleRepository,
                               ScheduleRepository scheduleRepository,
                               DiaryRepository diaryRepository) {
        this.aiSessionScheduleRepository = aiSessionScheduleRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
    }

    /**
     * 获取当前用户的所有日程（用于选择上下文）
     */
    @GetMapping("/context/schedules")
    public ApiResponse<List<AiDTO.ScheduleSummary>> listSchedules(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("REST 查询可选的上下文日程 — userId: {}", userId);

        List<Schedule> schedules = scheduleRepository.findByUserIdOrderByDateDescTimeDesc(userId);
        List<AiDTO.ScheduleSummary> result = schedules.stream()
                .map(s -> {
                    AiDTO.ScheduleSummary summary = new AiDTO.ScheduleSummary();
                    summary.setId(s.getId());
                    summary.setDate(s.getDate() != null ? s.getDate().toString() : null);
                    summary.setTime(s.getTime() != null ? s.getTime().toString() : null);
                    summary.setTitle(s.getTitle());
                    summary.setFeeling(s.getFeeling());
                    summary.setDescription(s.getDescription());
                    return summary;
                })
                .collect(Collectors.toList());
        return ApiResponse.success(result);
    }

    /**
     * 获取当前用户的所有日记（用于选择上下文）
     */
    @GetMapping("/context/diaries")
    public ApiResponse<List<AiDTO.DiarySummary>> listDiaries(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("REST 查询可选的上下文日记 — userId: {}", userId);

        List<Diary> diaries = diaryRepository.findByUserIdOrderByDateDesc(userId);
        List<AiDTO.DiarySummary> result = diaries.stream()
                .map(d -> {
                    AiDTO.DiarySummary summary = new AiDTO.DiarySummary();
                    summary.setId(d.getId());
                    summary.setDate(d.getDate() != null ? d.getDate().toString() : null);
                    summary.setTitle(d.getTitle());
                    // truncate content to 50 chars for list view
                    String content = d.getContent();
                    if (content != null && content.length() > 50) {
                        content = content.substring(0, 50) + "...";
                    }
                    summary.setContent(content);
                    return summary;
                })
                .collect(Collectors.toList());
        return ApiResponse.success(result);
    }

    /**
     * 添加日程或日记到会话上下文
     */
    @PostMapping("/sessions/{sessionId}/context")
    public ApiResponse<AiDTO.ContextEntry> addContext(
            @PathVariable Long sessionId,
            @Valid @RequestBody AiDTO.AddContextRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 添加上下文 — userId: {}, sessionId: {}, scheduleId: {}, diaryId: {}",
                userId, sessionId, request.getScheduleId(), request.getDiaryId());

        // Validate: exactly one of scheduleId or diaryId must be non-null
        if ((request.getScheduleId() == null && request.getDiaryId() == null) ||
            (request.getScheduleId() != null && request.getDiaryId() != null)) {
            throw new BadRequestException("必须且只能指定 scheduleId 或 diaryId 其中之一");
        }

        // Check if schedule entry already exists (unique constraint on sessionId + scheduleId)
        if (request.getScheduleId() != null) {
            var existing = aiSessionScheduleRepository.findBySessionIdAndScheduleId(sessionId, request.getScheduleId());
            if (existing.isPresent()) {
                AiSessionSchedule entry = existing.get();
                // Update tag if provided
                if (request.getTag() != null && !request.getTag().isBlank()) {
                    entry.setTag(request.getTag());
                    aiSessionScheduleRepository.save(entry);
                }
                return ApiResponse.success(toContextEntry(entry));
            }
        }

        // Create new context entry
        AiSessionSchedule entry = AiSessionSchedule.builder()
                .sessionId(sessionId)
                .scheduleId(request.getScheduleId())
                .diaryId(request.getDiaryId())
                .tag(request.getTag())
                .build();
        entry = aiSessionScheduleRepository.save(entry);
        log.info("上下文章条已保存 — id: {}", entry.getId());

        return ApiResponse.success(toContextEntry(entry));
    }

    /**
     * 删除会话上下文章条
     */
    @DeleteMapping("/sessions/{sessionId}/context/{id}")
    public ApiResponse<Void> removeContext(
            @PathVariable Long sessionId,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 删除上下文章条 — userId: {}, sessionId: {}, entryId: {}", userId, sessionId, id);

        AiSessionSchedule entry = aiSessionScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("上下文条目", id));

        // Security check: verify entry belongs to the session
        if (!entry.getSessionId().equals(sessionId)) {
            throw new ResourceNotFoundException("上下文条目", id);
        }

        aiSessionScheduleRepository.delete(entry);
        return ApiResponse.success();
    }

    /**
     * 获取会话的当前上下文条目列表
     */
    @GetMapping("/sessions/{sessionId}/context")
    public ApiResponse<List<AiDTO.ContextEntry>> getContext(
            @PathVariable Long sessionId,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 查询上下文列表 — userId: {}, sessionId: {}", userId, sessionId);

        List<AiSessionSchedule> entries = aiSessionScheduleRepository.findBySessionId(sessionId);
        List<AiDTO.ContextEntry> result = new ArrayList<>();
        for (AiSessionSchedule entry : entries) {
            result.add(toContextEntry(entry));
        }
        return ApiResponse.success(result);
    }

    /**
     * 将 AiSessionSchedule 转换为 ContextEntry DTO
     */
    private AiDTO.ContextEntry toContextEntry(AiSessionSchedule entry) {
        AiDTO.ContextEntry dto = new AiDTO.ContextEntry();
        dto.setId(entry.getId());
        dto.setScheduleId(entry.getScheduleId());
        dto.setDiaryId(entry.getDiaryId());
        dto.setTag(entry.getTag());

        if (entry.getScheduleId() != null) {
            // Load schedule data
            scheduleRepository.findById(entry.getScheduleId()).ifPresent(s -> {
                dto.setDate(s.getDate() != null ? s.getDate().toString() : null);
                dto.setTitle(s.getTitle());
                dto.setFeeling(s.getFeeling());
            });
            dto.setType("schedule");
        } else if (entry.getDiaryId() != null) {
            // Load diary data
            diaryRepository.findById(entry.getDiaryId()).ifPresent(d -> {
                dto.setDate(d.getDate() != null ? d.getDate().toString() : null);
                dto.setTitle(d.getTitle());
            });
            dto.setType("diary");
        }

        return dto;
    }
}
