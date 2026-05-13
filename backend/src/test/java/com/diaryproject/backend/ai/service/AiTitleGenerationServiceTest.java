package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.*;

class AiTitleGenerationServiceTest {

    @Test
    void generateTitle_skipsWhenSessionMissing() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiMessageRepository messageRepository = mock(AiMessageRepository.class);
        AiSessionService sessionService = mock(AiSessionService.class);
        AiTitleGenerationService service = service(sessionRepository, messageRepository, sessionService);
        when(sessionRepository.findById(10L)).thenReturn(Optional.empty());

        service.generateTitle(10L, "hello", "reply");

        verifyNoInteractions(sessionService);
    }

    @Test
    void generateTitle_skipsWhenSessionAlreadyHasCustomTitle() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiMessageRepository messageRepository = mock(AiMessageRepository.class);
        AiSessionService sessionService = mock(AiSessionService.class);
        AiTitleGenerationService service = service(sessionRepository, messageRepository, sessionService);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(
                AiSession.builder().id(10L).title("已有标题").build()));

        service.generateTitle(10L, "hello", "reply");

        verifyNoInteractions(sessionService);
        verifyNoInteractions(messageRepository);
    }

    @Test
    void generateTitle_skipsWhenNotFirstExchange() {
        AiSessionRepository sessionRepository = mock(AiSessionRepository.class);
        AiMessageRepository messageRepository = mock(AiMessageRepository.class);
        AiSessionService sessionService = mock(AiSessionService.class);
        AiTitleGenerationService service = service(sessionRepository, messageRepository, sessionService);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(
                AiSession.builder().id(10L).title("新对话").build()));
        when(messageRepository.findBySessionIdOrderBySequenceNumAsc(10L)).thenReturn(List.of(
                AiMessage.builder().build(),
                AiMessage.builder().build(),
                AiMessage.builder().build()));

        service.generateTitle(10L, "hello", "reply");

        verifyNoInteractions(sessionService);
    }

    private AiTitleGenerationService service(AiSessionRepository sessionRepository,
                                             AiMessageRepository messageRepository,
                                             AiSessionService sessionService) {
        return new AiTitleGenerationService(
                sessionRepository,
                messageRepository,
                sessionService,
                mock(PromptService.class),
                new AiTitleNormalizer(),
                mock(ChatModel.class));
    }
}
