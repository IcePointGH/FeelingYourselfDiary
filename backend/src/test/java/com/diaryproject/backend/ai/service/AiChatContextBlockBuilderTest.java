package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiChatContextBlockBuilderTest {

    @Test
    void build_returnsNullWhenNoContextEntries() {
        AiSessionScheduleRepository contextRepository = mock(AiSessionScheduleRepository.class);
        AiChatContextBlockBuilder builder = builder(contextRepository, mock(ScheduleRepository.class), mock(DiaryRepository.class));
        when(contextRepository.findBySessionId(10L)).thenReturn(List.of());

        assertNull(builder.build(10L));
    }

    @Test
    void build_formatsScheduleAndDiaryEntries() {
        AiSessionScheduleRepository contextRepository = mock(AiSessionScheduleRepository.class);
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        AiChatContextBlockBuilder builder = builder(contextRepository, scheduleRepository, diaryRepository);

        when(contextRepository.findBySessionId(10L)).thenReturn(List.of(
                AiSessionSchedule.builder().id(1L).sessionId(10L).scheduleId(20L).tag("重点").build(),
                AiSessionSchedule.builder().id(2L).sessionId(10L).diaryId(30L).build()
        ));
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(
                Schedule.builder().id(20L).title("散步").date(LocalDate.of(2026, 5, 13)).feeling(2).build()));
        when(diaryRepository.findById(30L)).thenReturn(Optional.of(
                Diary.builder().id(30L).title("回顾").content("状态不错").date(LocalDate.of(2026, 5, 13)).build()));

        String result = builder.build(10L);

        assertNotNull(result);
        assertTrue(result.startsWith("以下是我选取的需要分析的数据："));
        assertTrue(result.contains("【标签：重点】"));
        assertTrue(result.contains("标题：散步"));
        assertTrue(result.contains("标题：回顾"));
    }

    private AiChatContextBlockBuilder builder(AiSessionScheduleRepository contextRepository,
                                              ScheduleRepository scheduleRepository,
                                              DiaryRepository diaryRepository) {
        return new AiChatContextBlockBuilder(
                contextRepository,
                scheduleRepository,
                diaryRepository,
                new AiPromptRecordFormatter());
    }
}
