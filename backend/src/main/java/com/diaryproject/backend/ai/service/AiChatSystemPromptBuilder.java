package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.UserMemory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AiChatSystemPromptBuilder {

    private static final Logger log = LoggerFactory.getLogger(AiChatSystemPromptBuilder.class);

    private final PromptService promptService;
    private final MemoryService memoryService;

    public AiChatSystemPromptBuilder(PromptService promptService, MemoryService memoryService) {
        this.promptService = promptService;
        this.memoryService = memoryService;
    }

    public String build(Long userId) {
        String systemPrompt = promptService.getWithBase("chat-system");
        try {
            UserMemory memory = memoryService.getOrCreate(userId);
            if (memory.getContent() != null && !memory.getContent().isBlank()) {
                log.debug("User memory injected into system prompt — userId: {}", userId);
                return systemPrompt + "\n\n## 关于用户（基于历史对话分析）\n" + memory.getContent();
            }
        } catch (Exception e) {
            log.warn("Failed to load user memory for prompt injection — userId: {}", userId, e);
        }
        return systemPrompt;
    }
}
