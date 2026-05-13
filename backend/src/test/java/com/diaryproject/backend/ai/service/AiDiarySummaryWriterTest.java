package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.diary.service.DiaryService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AiDiarySummaryWriterTest {

    @Test
    void write_createsNewDiaryWhenSessionHasNoDiary() {
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        DiaryService diaryService = mock(DiaryService.class);
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiDiarySummaryWriter writer = new AiDiarySummaryWriter(diaryRepository, diaryService, sessionRepository);
        AiSession session = AiSession.builder().id(10L).build();
        when(diaryService.create(eq(1L), any(DiaryDTO.CreateRequest.class))).thenReturn(createdDiary(30L));

        AiDiarySummaryWriter.Result result = writer.write(1L, session, "title", "content", LocalDate.of(2026, 5, 13));

        assertEquals(30L, session.getDiaryId());
        assertEquals(30L, result.diaryId());
        assertFalse(result.updated());
        verify(sessionRepository).save(session);
    }

    @Test
    void write_updatesExistingDiaryWhenLinkedDiaryExists() {
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        DiaryService diaryService = mock(DiaryService.class);
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiDiarySummaryWriter writer = new AiDiarySummaryWriter(diaryRepository, diaryService, sessionRepository);
        AiSession session = AiSession.builder().id(10L).diaryId(30L).build();
        Diary diary = Diary.builder().id(30L).userId(1L).title("old").content("old").build();
        when(diaryRepository.findByUserIdAndId(1L, 30L)).thenReturn(Optional.of(diary));

        AiDiarySummaryWriter.Result result = writer.write(1L, session, "new title", "new content", LocalDate.of(2026, 5, 13));

        assertEquals("new title", diary.getTitle());
        assertEquals("new content", diary.getContent());
        assertEquals(30L, result.diaryId());
        assertTrue(result.updated());
        verify(diaryRepository).save(diary);
        verifyNoInteractions(diaryService);
    }

    @Test
    void write_createsReplacementWhenLinkedDiaryWasDeleted() {
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        DiaryService diaryService = mock(DiaryService.class);
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiDiarySummaryWriter writer = new AiDiarySummaryWriter(diaryRepository, diaryService, sessionRepository);
        AiSession session = AiSession.builder().id(10L).diaryId(30L).build();
        when(diaryRepository.findByUserIdAndId(1L, 30L)).thenReturn(Optional.empty());
        when(diaryService.create(eq(1L), any(DiaryDTO.CreateRequest.class))).thenReturn(createdDiary(31L));

        AiDiarySummaryWriter.Result result = writer.write(1L, session, "title", "content", LocalDate.of(2026, 5, 13));

        assertEquals(31L, session.getDiaryId());
        assertEquals(31L, result.diaryId());
        assertFalse(result.updated());
        verify(sessionRepository).save(session);
    }

    private DiaryDTO.Response createdDiary(Long id) {
        DiaryDTO.Response response = new DiaryDTO.Response();
        response.setId(id);
        return response;
    }
}
