package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class AiChatCompletionServiceTest {

    @Test
    void complete_savesAssistantMessageAndGeneratesTitle() {
        AiMessageRepository messageRepository = mock(AiMessageRepository.class);
        MemoryService memoryService = mock(MemoryService.class);
        AiTitleGenerationService titleGenerationService = mock(AiTitleGenerationService.class);
        AiChatCompletionService service = new AiChatCompletionService(
                messageRepository,
                memoryService,
                titleGenerationService
        );
        when(memoryService.incrementExchange(1L)).thenReturn(false);

        service.complete(1L, 10L, 2, "hello", "hi there");

        ArgumentCaptor<AiMessage> captor = ArgumentCaptor.forClass(AiMessage.class);
        verify(messageRepository).save(captor.capture());
        AiMessage saved = captor.getValue();
        assertEquals(10L, saved.getSessionId());
        assertEquals("assistant", saved.getRole());
        assertEquals("hi there", saved.getContent());
        assertEquals(2, saved.getSequenceNum());
        verify(titleGenerationService).generateTitle(10L, "hello", "hi there");
        verify(memoryService).incrementExchange(1L);
        verify(memoryService, never()).updateMemory(anyLong());
    }

    @Test
    void complete_updatesMemoryWhenThresholdReached() {
        AiMessageRepository messageRepository = mock(AiMessageRepository.class);
        MemoryService memoryService = mock(MemoryService.class);
        AiTitleGenerationService titleGenerationService = mock(AiTitleGenerationService.class);
        AiChatCompletionService service = new AiChatCompletionService(
                messageRepository,
                memoryService,
                titleGenerationService
        );
        when(memoryService.incrementExchange(1L)).thenReturn(true);

        service.complete(1L, 10L, 2, "hello", "hi there");

        verify(memoryService).updateMemory(1L);
    }

    @Test
    void complete_doesNotFailWhenMemoryCountingFails() {
        AiMessageRepository messageRepository = mock(AiMessageRepository.class);
        MemoryService memoryService = mock(MemoryService.class);
        AiTitleGenerationService titleGenerationService = mock(AiTitleGenerationService.class);
        AiChatCompletionService service = new AiChatCompletionService(
                messageRepository,
                memoryService,
                titleGenerationService
        );
        when(memoryService.incrementExchange(1L)).thenThrow(new IllegalStateException("redis down"));

        service.complete(1L, 10L, 2, "hello", "hi there");

        verify(messageRepository).save(any(AiMessage.class));
        verify(titleGenerationService).generateTitle(10L, "hello", "hi there");
        verify(memoryService, never()).updateMemory(anyLong());
    }
}
