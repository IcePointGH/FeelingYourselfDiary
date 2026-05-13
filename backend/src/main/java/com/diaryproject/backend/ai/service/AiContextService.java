package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AiContextService {

    private final AiSessionScheduleRepository aiSessionScheduleRepository;
    private final AiSessionRepository aiSessionRepository;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;

    public AiContextService(AiSessionScheduleRepository aiSessionScheduleRepository,
                            AiSessionRepository aiSessionRepository,
                            ScheduleRepository scheduleRepository,
                            DiaryRepository diaryRepository) {
        this.aiSessionScheduleRepository = aiSessionScheduleRepository;
        this.aiSessionRepository = aiSessionRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
    }

    @Transactional(readOnly = true)
    public List<AiDTO.ScheduleSummary> listSchedules(Long userId) {
        return scheduleRepository.findByUserIdOrderByDateDescTimeDesc(userId)
                .stream()
                .map(this::toScheduleSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AiDTO.DiarySummary> listDiaries(Long userId) {
        return diaryRepository.findByUserIdOrderByDateDesc(userId)
                .stream()
                .map(this::toDiarySummary)
                .collect(Collectors.toList());
    }

    @Transactional
    public AiDTO.ContextEntry addContext(Long userId, Long sessionId, AiDTO.AddContextRequest request) {
        validateSingleContextTarget(request);
        requireSession(userId, sessionId);

        if (request.getScheduleId() != null) {
            requireSchedule(userId, request.getScheduleId());
            return addScheduleContext(sessionId, request);
        }

        requireDiary(userId, request.getDiaryId());
        return addDiaryContext(sessionId, request);
    }

    @Transactional
    public void removeContext(Long userId, Long sessionId, Long entryId) {
        requireSession(userId, sessionId);

        AiSessionSchedule entry = aiSessionScheduleRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("AI context", entryId));
        if (!entry.getSessionId().equals(sessionId)) {
            throw new ResourceNotFoundException("AI context", entryId);
        }

        aiSessionScheduleRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public List<AiDTO.ContextEntry> getContext(Long userId, Long sessionId) {
        requireSession(userId, sessionId);
        return aiSessionScheduleRepository.findBySessionId(sessionId)
                .stream()
                .map(this::toContextEntry)
                .collect(Collectors.toList());
    }

    private AiDTO.ContextEntry addScheduleContext(Long sessionId, AiDTO.AddContextRequest request) {
        AiSessionSchedule entry = aiSessionScheduleRepository
                .findBySessionIdAndScheduleId(sessionId, request.getScheduleId())
                .map(existing -> {
                    if (request.getTag() != null && !request.getTag().isBlank()) {
                        existing.setTag(request.getTag());
                        return aiSessionScheduleRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> aiSessionScheduleRepository.save(AiSessionSchedule.builder()
                        .sessionId(sessionId)
                        .scheduleId(request.getScheduleId())
                        .tag(request.getTag())
                        .build()));

        return toContextEntry(entry);
    }

    private AiDTO.ContextEntry addDiaryContext(Long sessionId, AiDTO.AddContextRequest request) {
        AiSessionSchedule entry = aiSessionScheduleRepository.findBySessionId(sessionId)
                .stream()
                .filter(existing -> Objects.equals(existing.getDiaryId(), request.getDiaryId()))
                .findFirst()
                .map(existing -> {
                    if (request.getTag() != null && !request.getTag().isBlank()) {
                        existing.setTag(request.getTag());
                        return aiSessionScheduleRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> aiSessionScheduleRepository.save(AiSessionSchedule.builder()
                        .sessionId(sessionId)
                        .diaryId(request.getDiaryId())
                        .tag(request.getTag())
                        .build()));

        return toContextEntry(entry);
    }

    private void validateSingleContextTarget(AiDTO.AddContextRequest request) {
        boolean hasSchedule = request.getScheduleId() != null;
        boolean hasDiary = request.getDiaryId() != null;
        if (hasSchedule == hasDiary) {
            throw new BadRequestException("Exactly one of scheduleId or diaryId is required");
        }
    }

    private void requireSession(Long userId, Long sessionId) {
        aiSessionRepository.findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI session", sessionId));
    }

    private Schedule requireSchedule(Long userId, Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", scheduleId));
        if (!Objects.equals(schedule.getUserId(), userId)) {
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }
        return schedule;
    }

    private Diary requireDiary(Long userId, Long diaryId) {
        return diaryRepository.findByUserIdAndId(userId, diaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Diary", diaryId));
    }

    private AiDTO.ScheduleSummary toScheduleSummary(Schedule schedule) {
        AiDTO.ScheduleSummary summary = new AiDTO.ScheduleSummary();
        summary.setId(schedule.getId());
        summary.setDate(schedule.getDate() != null ? schedule.getDate().toString() : null);
        summary.setTime(schedule.getTime() != null ? schedule.getTime().toString() : null);
        summary.setTitle(schedule.getTitle());
        summary.setFeeling(schedule.getFeeling());
        summary.setDescription(schedule.getDescription());
        return summary;
    }

    private AiDTO.DiarySummary toDiarySummary(Diary diary) {
        AiDTO.DiarySummary summary = new AiDTO.DiarySummary();
        summary.setId(diary.getId());
        summary.setDate(diary.getDate() != null ? diary.getDate().toString() : null);
        summary.setTitle(diary.getTitle());
        String content = diary.getContent();
        if (content != null && content.length() > 50) {
            content = content.substring(0, 50) + "...";
        }
        summary.setContent(content);
        return summary;
    }

    private AiDTO.ContextEntry toContextEntry(AiSessionSchedule entry) {
        AiDTO.ContextEntry dto = new AiDTO.ContextEntry();
        dto.setId(entry.getId());
        dto.setScheduleId(entry.getScheduleId());
        dto.setDiaryId(entry.getDiaryId());
        dto.setTag(entry.getTag());

        if (entry.getScheduleId() != null) {
            scheduleRepository.findById(entry.getScheduleId()).ifPresent(schedule -> {
                dto.setDate(schedule.getDate() != null ? schedule.getDate().toString() : null);
                dto.setTitle(schedule.getTitle());
                dto.setFeeling(schedule.getFeeling());
            });
            dto.setType("schedule");
        } else if (entry.getDiaryId() != null) {
            diaryRepository.findById(entry.getDiaryId()).ifPresent(diary -> {
                dto.setDate(diary.getDate() != null ? diary.getDate().toString() : null);
                dto.setTitle(diary.getTitle());
            });
            dto.setType("diary");
        }

        return dto;
    }
}
