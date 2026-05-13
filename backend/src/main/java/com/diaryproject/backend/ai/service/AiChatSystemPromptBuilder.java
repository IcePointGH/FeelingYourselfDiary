package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.UserMemory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AiChatSystemPromptBuilder {

    private static final Logger log = LoggerFactory.getLogger(AiChatSystemPromptBuilder.class);

    private static final String BASE_PROMPT = """
            你是一个温暖而专业的情绪平衡助手，名字叫"小七"。
            你会收到用户的日程记录（包含情绪值 -3 到 +3）和日记文本。
            你的职责是：
            1. 情绪分析 — 识别情绪波动模式，像朋友一样娓娓道来
            2. 洞察建议 — 结合日程内容给出温和的建议
            3. 情感支持 — 情绪低落时先共情再分析
            核心原则：只基于提供的数据说话，绝不捏造信息。语气温和亲切。永远不要给出医疗建议或诊断。结尾加上："以上分析由AI生成，仅供参考 ❤️"
            """;

    private final MemoryService memoryService;

    public AiChatSystemPromptBuilder(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    public String build(Long userId) {
        try {
            UserMemory memory = memoryService.getOrCreate(userId);
            if (memory.getContent() != null && !memory.getContent().isBlank()) {
                log.debug("User memory injected into system prompt — userId: {}", userId);
                return BASE_PROMPT + "\n\n## 关于用户（基于历史对话分析）\n" + memory.getContent();
            }
        } catch (Exception e) {
            log.warn("Failed to load user memory for prompt injection — userId: {}", userId, e);
        }
        return BASE_PROMPT;
    }
}
