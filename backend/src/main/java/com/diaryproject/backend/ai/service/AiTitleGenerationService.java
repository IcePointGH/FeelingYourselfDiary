package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.text.MessageFormat;

@Service
public class AiTitleGenerationService {

    private static final Logger log = LoggerFactory.getLogger(AiTitleGenerationService.class);
    private static final String DEFAULT_CHAT_TITLE = "新对话";

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final AiSessionService aiSessionService;
    private final PromptService promptService;
    private final AiTitleNormalizer titleNormalizer;
    private final ChatClient chatClient;

    public AiTitleGenerationService(AiSessionRepository aiSessionRepository,
                                    AiMessageRepository aiMessageRepository,
                                    AiSessionService aiSessionService,
                                    PromptService promptService,
                                    AiTitleNormalizer titleNormalizer,
                                    ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.aiSessionService = aiSessionService;
        this.promptService = promptService;
        this.titleNormalizer = titleNormalizer;
        this.chatClient = ChatClient.builder(chatModel).build();
    }

    @Async("aiTaskExecutor")
    public void generateTitle(Long sessionId, String firstUserMsg, String firstAssistantMsg) {
        try {
            AiSession session = aiSessionRepository.findById(sessionId).orElse(null);
            if (session == null) {
                log.warn("auto-title: session not found — sessionId: {}", sessionId);
                return;
            }
            if (!DEFAULT_CHAT_TITLE.equals(session.getTitle())) {
                return;
            }
            long msgCount = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId).size();
            if (msgCount != 2) {
                return;
            }

            log.info("auto-title: generating title for sessionId: {}", sessionId);
            String promptTemplate = promptService.get("title-generation");
            String prompt = MessageFormat.format(promptTemplate, firstUserMsg, firstAssistantMsg);

            String response = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .chatResponse()
                    .getResult()
                    .getOutput()
                    .getText();

            if (response == null || response.isBlank()) {
                log.warn("auto-title: empty response from 大模型 — sessionId: {}", sessionId);
                return;
            }

            String title = titleNormalizer.normalize(response);
            aiSessionService.renameSession(sessionId, title);
            log.info("auto-title: session {} renamed to \"{}\"", sessionId, title);
        } catch (Exception e) {
            log.warn("auto-title: failed to generate title for sessionId: {}", sessionId, e);
        }
    }
}
