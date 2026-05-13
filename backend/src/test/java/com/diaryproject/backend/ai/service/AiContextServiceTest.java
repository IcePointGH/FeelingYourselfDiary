package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AiContextServiceTest {

    @Test
    void addContext_rejectsRequestWithoutExactlyOneContextTarget() {
        var service = serviceWithMocks();
        AiDTO.AddContextRequest request = new AiDTO.AddContextRequest();

        assertThrows(BadRequestException.class, () -> service.addContext(1L, 10L, request));

        request.setScheduleId(20L);
        request.setDiaryId(30L);
        assertThrows(BadRequestException.class, () -> service.addContext(1L, 10L, request));
    }

    @Test
    void addContext_reusesExistingScheduleContextAndUpdatesTag() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiSessionScheduleRepository contextRepository = mock(AiSessionScheduleRepository.class);
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        AiContextService service = new AiContextService(
                contextRepository, sessionRepository, scheduleRepository, diaryRepository);

        when(sessionRepository.findByUserIdAndId(1L, 10L))
                .thenReturn(Optional.of(AiSession.builder().id(10L).userId(1L).build()));
        when(scheduleRepository.findById(20L))
                .thenReturn(Optional.of(schedule(20L, 1L, "Morning walk")));

        AiSessionSchedule existing = AiSessionSchedule.builder()
                .id(100L)
                .sessionId(10L)
                .scheduleId(20L)
                .build();
        when(contextRepository.findBySessionIdAndScheduleId(10L, 20L))
                .thenReturn(Optional.of(existing));
        when(contextRepository.save(existing)).thenReturn(existing);

        AiDTO.AddContextRequest request = new AiDTO.AddContextRequest();
        request.setScheduleId(20L);
        request.setTag("important");

        AiDTO.ContextEntry result = service.addContext(1L, 10L, request);

        assertEquals(100L, result.getId());
        assertEquals(20L, result.getScheduleId());
        assertEquals("important", result.getTag());
        assertEquals("schedule", result.getType());
        verify(contextRepository).save(existing);
    }

    @Test
    void addContext_rejectsScheduleOwnedByAnotherUser() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiSessionScheduleRepository contextRepository = mock(AiSessionScheduleRepository.class);
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        AiContextService service = new AiContextService(
                contextRepository, sessionRepository, scheduleRepository, diaryRepository);

        when(sessionRepository.findByUserIdAndId(1L, 10L))
                .thenReturn(Optional.of(AiSession.builder().id(10L).userId(1L).build()));
        when(scheduleRepository.findById(20L))
                .thenReturn(Optional.of(schedule(20L, 2L, "Other user's schedule")));

        AiDTO.AddContextRequest request = new AiDTO.AddContextRequest();
        request.setScheduleId(20L);

        assertThrows(ResourceNotFoundException.class, () -> service.addContext(1L, 10L, request));
        verify(contextRepository, never()).save(any());
    }

    @Test
    void getContext_requiresSessionOwnershipAndMapsEntries() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiSessionScheduleRepository contextRepository = mock(AiSessionScheduleRepository.class);
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        AiContextService service = new AiContextService(
                contextRepository, sessionRepository, scheduleRepository, diaryRepository);

        when(sessionRepository.findByUserIdAndId(1L, 10L))
                .thenReturn(Optional.of(AiSession.builder().id(10L).userId(1L).build()));
        when(contextRepository.findBySessionId(10L)).thenReturn(List.of(
                AiSessionSchedule.builder().id(100L).sessionId(10L).scheduleId(20L).tag("work").build(),
                AiSessionSchedule.builder().id(101L).sessionId(10L).diaryId(30L).build()
        ));
        when(scheduleRepository.findById(20L))
                .thenReturn(Optional.of(schedule(20L, 1L, "Morning walk")));
        when(diaryRepository.findById(30L))
                .thenReturn(Optional.of(diary(30L, 1L, "Reflection")));

        List<AiDTO.ContextEntry> result = service.getContext(1L, 10L);

        assertEquals(2, result.size());
        assertEquals("schedule", result.get(0).getType());
        assertEquals("Morning walk", result.get(0).getTitle());
        assertEquals(2, result.get(0).getFeeling());
        assertEquals("diary", result.get(1).getType());
        assertEquals("Reflection", result.get(1).getTitle());
    }

    @Test
    void removeContext_requiresSessionOwnershipAndEntryMembership() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiSessionScheduleRepository contextRepository = mock(AiSessionScheduleRepository.class);
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        AiContextService service = new AiContextService(
                contextRepository, sessionRepository, scheduleRepository, diaryRepository);

        when(sessionRepository.findByUserIdAndId(1L, 10L))
                .thenReturn(Optional.of(AiSession.builder().id(10L).userId(1L).build()));
        AiSessionSchedule entry = AiSessionSchedule.builder().id(100L).sessionId(10L).scheduleId(20L).build();
        when(contextRepository.findById(100L)).thenReturn(Optional.of(entry));

        service.removeContext(1L, 10L, 100L);

        verify(contextRepository).delete(entry);

        AiSessionSchedule otherSessionEntry = AiSessionSchedule.builder().id(101L).sessionId(11L).scheduleId(20L).build();
        when(contextRepository.findById(101L)).thenReturn(Optional.of(otherSessionEntry));
        assertThrows(ResourceNotFoundException.class, () -> service.removeContext(1L, 10L, 101L));
    }

    private AiContextService serviceWithMocks() {
        return new AiContextService(
                mock(AiSessionScheduleRepository.class),
                mock(AiSessionRepository.class),
                mock(ScheduleRepository.class),
                mock(DiaryRepository.class));
    }

    private Schedule schedule(Long id, Long userId, String title) {
        return Schedule.builder()
                .id(id)
                .userId(userId)
                .title(title)
                .date(LocalDate.of(2026, 5, 13))
                .time(LocalTime.of(9, 0))
                .feeling(2)
                .description("desc")
                .build();
    }

    private Diary diary(Long id, Long userId, String title) {
        return Diary.builder()
                .id(id)
                .userId(userId)
                .title(title)
                .date(LocalDate.of(2026, 5, 13))
                .content("content")
                .build();
    }
}
