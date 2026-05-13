package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AiChatContextBlockBuilder {

    private static final Logger log = LoggerFactory.getLogger(AiChatContextBlockBuilder.class);

    private final AiSessionScheduleRepository aiSessionScheduleRepository;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;
    private final AiPromptRecordFormatter recordFormatter;

    public AiChatContextBlockBuilder(AiSessionScheduleRepository aiSessionScheduleRepository,
                                     ScheduleRepository scheduleRepository,
                                     DiaryRepository diaryRepository,
                                     AiPromptRecordFormatter recordFormatter) {
        this.aiSessionScheduleRepository = aiSessionScheduleRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.recordFormatter = recordFormatter;
    }

    public String build(Long sessionId) {
        List<AiSessionSchedule> contextEntries = aiSessionScheduleRepository.findBySessionId(sessionId);
        if (contextEntries.isEmpty()) {
            return null;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("以下是我选取的需要分析的数据：\n\n");

        for (AiSessionSchedule entry : contextEntries) {
            if (entry.getScheduleId() != null) {
                scheduleRepository.findById(entry.getScheduleId())
                        .ifPresent(schedule -> sb.append(recordFormatter.formatContextRecord(entry, schedule, null)));
            } else if (entry.getDiaryId() != null) {
                diaryRepository.findById(entry.getDiaryId())
                        .ifPresent(diary -> sb.append(recordFormatter.formatContextRecord(entry, null, diary)));
            }
        }

        String result = sb.toString();
        log.info("AI chat context block built — sessionId: {}, entries: {}, len: {}",
                sessionId, contextEntries.size(), result.length());
        return result;
    }
}
