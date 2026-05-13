package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiChatCompletionService {

    private static final Logger log = LoggerFactory.getLogger(AiChatCompletionService.class);

    private final AiMessageRepository aiMessageRepository;
    private final MemoryService memoryService;
    private final AiTitleGenerationService titleGenerationService;

    public AiChatCompletionService(AiMessageRepository aiMessageRepository,
                                   MemoryService memoryService,
                                   AiTitleGenerationService titleGenerationService) {
        this.aiMessageRepository = aiMessageRepository;
        this.memoryService = memoryService;
        this.titleGenerationService = titleGenerationService;
    }

    @Transactional
    public void complete(Long userId,
                         Long sessionId,
                         int assistantSequenceNum,
                         String userMessage,
                         String assistantMessage) {
        saveAssistantMessage(sessionId, assistantSequenceNum, assistantMessage);
        titleGenerationService.generateTitle(sessionId, userMessage, assistantMessage);
        updateMemoryAfterExchange(userId);
    }

    private void saveAssistantMessage(Long sessionId, int sequenceNum, String content) {
        AiMessage assistantMsg = AiMessage.builder()
                .sessionId(sessionId)
                .role("assistant")
                .content(content)
                .sequenceNum(sequenceNum)
                .build();
        aiMessageRepository.save(assistantMsg);
        log.info("Assistant message saved - sessionId: {}, seq: {}, len: {}", sessionId, sequenceNum, content.length());
    }

    private void updateMemoryAfterExchange(Long userId) {
        try {
            if (memoryService.incrementExchange(userId)) {
                log.info("Memory threshold reached, triggering async update for user {}", userId);
                memoryService.updateMemory(userId);
            }
        } catch (Exception memEx) {
            log.warn("Memory exchange counting failed - userId: {}", userId, memEx);
        }
    }
}
