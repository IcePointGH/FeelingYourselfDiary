package com.diaryproject.backend.diary;

import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.diary.service.DiaryService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DiaryService exception types.
 * Verifies that update() throws ResourceNotFoundException (not generic RuntimeException).
 */
class DiaryServiceExceptionTest {

    @Test
    void update_throwsResourceNotFoundException_whenDiaryNotFound() {
        DiaryRepository mockRepo = mock(DiaryRepository.class);
        when(mockRepo.findByUserIdAndId(1L, 999L)).thenReturn(Optional.empty());

        DiaryService service = new DiaryService(mockRepo);

        DiaryDTO.UpdateRequest request = new DiaryDTO.UpdateRequest();
        request.setTitle("Updated Title");
        request.setContent("Updated content");

        assertThrows(ResourceNotFoundException.class,
                () -> service.update(1L, 999L, request));
    }
}
