package com.diaryproject.backend.ai.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;
import org.springframework.ai.chat.model.ChatModel;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;

@SuppressWarnings("unchecked")
class AiAnalysisServiceTest {

    private PromptService stubPromptService() {
        PromptService ps = mock(PromptService.class);
        when(ps.get(anyString())).thenReturn("你是一个温暖而专业的情绪平衡助手");
        when(ps.getWithBase(anyString())).thenReturn("你是一个温暖而专业的情绪平衡助手");
        return ps;
    }

    @Test
    void analyzeFullHistory_emptyData_setsCompletedWithInfoMessage() {
        AiSessionRepository aiSessionRepo = mock(AiSessionRepository.class);
        AiMessageRepository aiMessageRepo = mock(AiMessageRepository.class);
        ScheduleRepository scheduleRepo = mock(ScheduleRepository.class);
        DiaryRepository diaryRepo = mock(DiaryRepository.class);
        HistoryChunkingService chunkingService = mock(HistoryChunkingService.class);
        PromptService promptService = stubPromptService();
        ChatModel chatModel = mock(ChatModel.class);

        AiSession session = AiSession.builder().id(1L).userId(1L).status("active").progress(0).build();
        when(aiSessionRepo.findByUserIdAndId(anyLong(), anyLong())).thenReturn(Optional.of(session));
        when(aiSessionRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(scheduleRepo.findByUserIdOrderByDateDescTimeDesc(anyLong())).thenReturn(Collections.emptyList());
        when(diaryRepo.findByUserIdOrderByDateDesc(anyLong())).thenReturn(Collections.emptyList());

        AiAnalysisService service = mock(AiAnalysisService.class,
                withSettings().useConstructor(aiSessionRepo, aiMessageRepo, scheduleRepo, diaryRepo, chunkingService, promptService, chatModel)
                              .defaultAnswer(CALLS_REAL_METHODS));

        service.analyzeFullHistory(1L, 1L);

        assertEquals("completed", session.getStatus());
        assertEquals(100, session.getProgress());
        verify(aiMessageRepo, atLeastOnce()).save(any(AiMessage.class));
        verify(chunkingService, never()).chunk(anyList(), anyList(), anyInt());
    }

    @Test
    void analyzeFullHistory_singleChunk_setsCompleted() {
        AiSessionRepository aiSessionRepo = mock(AiSessionRepository.class);
        AiMessageRepository aiMessageRepo = mock(AiMessageRepository.class);
        ScheduleRepository scheduleRepo = mock(ScheduleRepository.class);
        DiaryRepository diaryRepo = mock(DiaryRepository.class);
        HistoryChunkingService chunkingService = mock(HistoryChunkingService.class);
        PromptService promptService = stubPromptService();
        ChatModel chatModel = mock(ChatModel.class);

        AiSession session = AiSession.builder().id(1L).userId(1L).status("active").progress(0).build();
        when(aiSessionRepo.findByUserIdAndId(anyLong(), anyLong())).thenReturn(Optional.of(session));
        when(aiSessionRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Schedule s1 = Schedule.builder().id(1L).userId(1L).title("晨会").date(LocalDate.of(2024, 1, 1)).feeling(2).build();
        Diary d1 = Diary.builder().id(1L).userId(1L).title("日记").content("今天不错").date(LocalDate.of(2024, 1, 1)).build();
        when(scheduleRepo.findByUserIdOrderByDateDescTimeDesc(anyLong())).thenReturn(List.of(s1));
        when(diaryRepo.findByUserIdOrderByDateDesc(anyLong())).thenReturn(List.of(d1));

        HistoryChunkingService.Chunk chunk = new HistoryChunkingService.Chunk(
                List.of(s1), List.of(d1), 150, "2024-01-01 ~ 2024-01-01");
        when(chunkingService.chunk(anyList(), anyList(), anyInt())).thenReturn(List.of(chunk));

        AiAnalysisService service = mock(AiAnalysisService.class,
                withSettings().useConstructor(aiSessionRepo, aiMessageRepo, scheduleRepo, diaryRepo, chunkingService, promptService, chatModel)
                              .defaultAnswer(CALLS_REAL_METHODS));
        doReturn("分析结果：用户情绪状态良好。").when(service).callModel(anyString(), anyString());
        doReturn("模拟的用户提示内容").when(service).buildUserPrompt(anyList(), anyList());

        service.analyzeFullHistory(1L, 1L);

        assertEquals("completed", session.getStatus());
        assertEquals(100, session.getProgress());
        verify(aiMessageRepo, atLeast(1)).save(any(AiMessage.class));
        verify(service, times(1)).callModel(anyString(), anyString());
        verify(service, times(1)).buildUserPrompt(anyList(), anyList());
    }

    @Test
    void analyzeFullHistory_progressUpdated_correctPercentage() {
        AiSessionRepository aiSessionRepo = mock(AiSessionRepository.class);
        AiMessageRepository aiMessageRepo = mock(AiMessageRepository.class);
        ScheduleRepository scheduleRepo = mock(ScheduleRepository.class);
        DiaryRepository diaryRepo = mock(DiaryRepository.class);
        HistoryChunkingService chunkingService = mock(HistoryChunkingService.class);
        PromptService promptService = stubPromptService();
        ChatModel chatModel = mock(ChatModel.class);

        AiSession session = AiSession.builder().id(1L).userId(1L).status("active").progress(0).build();
        when(aiSessionRepo.findByUserIdAndId(anyLong(), anyLong())).thenReturn(Optional.of(session));
        when(aiSessionRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<Schedule> schedules = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            schedules.add(Schedule.builder()
                    .id((long) i).userId(1L).title("日程" + i)
                    .date(LocalDate.of(2024, 1, i)).feeling(i)
                    .description("x".repeat(500))
                    .build());
        }
        when(scheduleRepo.findByUserIdOrderByDateDescTimeDesc(anyLong())).thenReturn(schedules);
        when(diaryRepo.findByUserIdOrderByDateDesc(anyLong())).thenReturn(Collections.emptyList());

        List<HistoryChunkingService.Chunk> chunks = schedules.stream()
                .map(s -> new HistoryChunkingService.Chunk(
                        List.of(s), Collections.emptyList(), 350,
                        s.getDate() + " ~ " + s.getDate()))
                .collect(Collectors.toList());
        when(chunkingService.chunk(anyList(), anyList(), anyInt())).thenReturn(chunks);

        AiAnalysisService service = mock(AiAnalysisService.class,
                withSettings().useConstructor(aiSessionRepo, aiMessageRepo, scheduleRepo, diaryRepo, chunkingService, promptService, chatModel)
                              .defaultAnswer(CALLS_REAL_METHODS));
        doReturn("分析结果").when(service).callModel(anyString(), anyString());
        doReturn("提示内容").when(service).buildUserPrompt(anyList(), anyList());

        service.analyzeFullHistory(1L, 1L);

        verify(aiSessionRepo, atLeast(5)).save(any(AiSession.class));
        assertEquals("completed", session.getStatus());
        assertEquals(100, session.getProgress());
        verify(service, times(4)).callModel(anyString(), anyString());
    }

    @Test
    void analyzeFullHistory_failure_setsFailedStatus() {
        AiSessionRepository aiSessionRepo = mock(AiSessionRepository.class);
        AiMessageRepository aiMessageRepo = mock(AiMessageRepository.class);
        ScheduleRepository scheduleRepo = mock(ScheduleRepository.class);
        DiaryRepository diaryRepo = mock(DiaryRepository.class);
        HistoryChunkingService chunkingService = mock(HistoryChunkingService.class);
        PromptService promptService = stubPromptService();
        ChatModel chatModel = mock(ChatModel.class);

        AiSession session = AiSession.builder().id(1L).userId(1L).status("active").progress(0).build();
        when(aiSessionRepo.findByUserIdAndId(anyLong(), anyLong())).thenReturn(Optional.of(session));
        when(aiSessionRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Schedule s1 = Schedule.builder().id(1L).userId(1L).title("日程").date(LocalDate.of(2024, 1, 1)).feeling(2).build();
        when(scheduleRepo.findByUserIdOrderByDateDescTimeDesc(anyLong())).thenReturn(List.of(s1));
        when(diaryRepo.findByUserIdOrderByDateDesc(anyLong())).thenReturn(Collections.emptyList());

        HistoryChunkingService.Chunk chunk = new HistoryChunkingService.Chunk(
                List.of(s1), Collections.emptyList(), 75, "2024-01-01 ~ 2024-01-01");
        when(chunkingService.chunk(anyList(), anyList(), anyInt())).thenReturn(List.of(chunk));

        AiAnalysisService service = mock(AiAnalysisService.class,
                withSettings().useConstructor(aiSessionRepo, aiMessageRepo, scheduleRepo, diaryRepo, chunkingService, promptService, chatModel)
                              .defaultAnswer(CALLS_REAL_METHODS));
        doThrow(new RuntimeException("API调用失败")).when(service).callModel(anyString(), anyString());
        doReturn("提示内容").when(service).buildUserPrompt(anyList(), anyList());

        service.analyzeFullHistory(1L, 1L);

        assertEquals("failed", session.getStatus());
        assertNotEquals(100, session.getProgress());
        verify(aiSessionRepo, atLeast(2)).save(any(AiSession.class));
    }
}
