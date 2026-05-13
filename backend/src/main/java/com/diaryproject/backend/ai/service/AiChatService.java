package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final AiConversationBuilder conversationBuilder;
    private final AiChatContextBlockBuilder contextBlockBuilder;
    private final AiChatSystemPromptBuilder systemPromptBuilder;
    private final AiChatCompletionService completionService;
    private final ChatClient chatClient;

    public AiChatService(AiSessionRepository aiSessionRepository,
                         AiMessageRepository aiMessageRepository,
                         AiConversationBuilder conversationBuilder,
                         AiChatContextBlockBuilder contextBlockBuilder,
                         AiChatSystemPromptBuilder systemPromptBuilder,
                         AiChatCompletionService completionService,
                         ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.conversationBuilder = conversationBuilder;
        this.contextBlockBuilder = contextBlockBuilder;
        this.systemPromptBuilder = systemPromptBuilder;
        this.completionService = completionService;
        this.chatClient = ChatClient.builder(chatModel).build();
        log.info("AiChatService initialized - chatModel: {}", chatModel.getClass().getSimpleName());
    }

    public SseEmitter chat(Long userId, Long sessionId, String userMessage) {
        aiSessionRepository.findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI session", sessionId));

        List<AiMessage> allMessages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        int seq = allMessages.size() + 1;

        AiMessage userMsg = AiMessage.builder()
                .sessionId(sessionId)
                .role("user")
                .content(userMessage)
                .sequenceNum(seq)
                .build();
        aiMessageRepository.save(userMsg);
        log.info("User message saved - sessionId: {}, seq: {}", sessionId, seq);

        List<AiMessage> contextMessages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        contextMessages = conversationBuilder.recentWindow(contextMessages, 40);

        String contextBlock = contextBlockBuilder.build(sessionId);
        String systemPrompt = systemPromptBuilder.build(userId);
        List<Message> messages = conversationBuilder.buildChatMessages(systemPrompt, contextMessages, contextBlock);

        SseEmitter sseEmitter = new SseEmitter(300_000L);
        StringBuilder fullResponse = new StringBuilder();
        long startNanos = System.nanoTime();

        log.info("Starting AI chat stream - sessionId: {}, messages: {}, tokens~: {}",
                sessionId, messages.size(), estimateTokens(messages));

        chatClient.prompt()
                .messages(messages)
                .stream()
                .content()
                .subscribe(
                        chunk -> {
                            try {
                                sseEmitter.send(SseEmitter.event().data(chunk));
                                fullResponse.append(chunk);
                            } catch (IOException e) {
                                log.error("SSE send failed - sessionId: {}", sessionId, e);
                            }
                        },
                        error -> {
                            long elapsed = (System.nanoTime() - startNanos) / 1_000_000;
                            log.error("AI chat stream failed - sessionId: {}, elapsed: {}ms, error: {}",
                                    sessionId, elapsed, error.toString(), error);
                            try {
                                sseEmitter.completeWithError(error);
                            } catch (Exception ignored) {
                                // The emitter may already be closed by the client.
                            }
                        },
                        () -> {
                            try {
                                long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
                                String responseText = fullResponse.toString();
                                if (!responseText.isEmpty()) {
                                    log.info("AI chat stream completed - sessionId: {}, chars: {}, elapsed: {}ms",
                                            sessionId, responseText.length(), elapsedMs);
                                    completionService.complete(userId, sessionId, seq + 1, userMessage, responseText);
                                } else {
                                    log.warn("AI chat stream returned an empty response - sessionId: {}, elapsed: {}ms",
                                            sessionId, elapsedMs);
                                }
                                sseEmitter.complete();
                            } catch (Exception e) {
                                log.error("AI chat completion handling failed - sessionId: {}", sessionId, e);
                                try {
                                    sseEmitter.completeWithError(e);
                                } catch (Exception ignored) {
                                    // The emitter may already be closed by the client.
                                }
                            }
                        }
                );

        return sseEmitter;
    }

    private int estimateTokens(List<Message> messages) {
        int total = 0;
        for (Message message : messages) {
            String text = message.getText();
            if (text != null) {
                total += text.length() * 2 / 3;
            }
        }
        return total;
    }
}
