package com.diaryproject.backend.schedule;

import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.schedule.service.ScheduleService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ScheduleService exception types.
 * Verifies that update() throws ResourceNotFoundException (not generic RuntimeException).
 */
class ScheduleServiceExceptionTest {

    @Test
    void update_throwsResourceNotFoundException_whenScheduleNotFound() {
        ScheduleRepository mockRepo = mock(ScheduleRepository.class);
        when(mockRepo.findById(999L)).thenReturn(Optional.empty());

        ScheduleService service = new ScheduleService(mockRepo);

        ScheduleDTO.UpdateRequest request = new ScheduleDTO.UpdateRequest();
        request.setTitle("Updated Title");

        assertThrows(ResourceNotFoundException.class,
                () -> service.update(1L, 999L, request));
    }
}
