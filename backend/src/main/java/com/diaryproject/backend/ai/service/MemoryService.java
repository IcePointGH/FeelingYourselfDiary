package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.UserMemory;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.UserMemoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.MessageFormat;
import java.util.List;

/**
 * 用户记忆画像服务 — 管理每个用户的长期对话画像。
 * <p>
 * 每 {@code exchangeThreshold} 轮完整对话后自动触发 {@link #updateMemory(Long)}
 * 异步更新画像内容，使 AI 对话能保持对用户特征的长期记忆。
 * </p>
 */
@Service
public class MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryService.class);

    private final UserMemoryRepository userMemoryRepository;
    private final AiMessageRepository aiMessageRepository;
    private final PromptService promptService;
    private final ChatClient chatClient;

    @Value("${ai.memory.exchange-threshold:5}")
    private int exchangeThreshold;

    public MemoryService(UserMemoryRepository userMemoryRepository,
                         AiMessageRepository aiMessageRepository,
                         PromptService promptService,
                         ChatModel chatModel) {
        this.userMemoryRepository = userMemoryRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.promptService = promptService;
        this.chatClient = ChatClient.builder(chatModel).build();
    }

    /**
     * 获取或创建用户的记忆画像记录。
     */
    @Transactional
    public UserMemory getOrCreate(Long userId) {
        return userMemoryRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserMemory memory = UserMemory.builder()
                            .userId(userId)
                            .content("")
                            .exchangeCount(0)
                            .build();
                    UserMemory saved = userMemoryRepository.save(memory);
                    log.info("UserMemory created for userId: {}", userId);
                    return saved;
                });
    }

    /**
     * 递增用户的对话轮次计数。
     *
     * @return true 如果达到阈值（exchangeCount % threshold == 0），应触发异步画像更新
     */
    @Transactional
    public boolean incrementExchange(Long userId) {
        UserMemory memory = getOrCreate(userId);
        memory.setExchangeCount(memory.getExchangeCount() + 1);
        userMemoryRepository.save(memory);
        boolean thresholdReached = memory.getExchangeCount() % exchangeThreshold == 0;
        if (thresholdReached) {
            log.info("Memory exchange threshold reached for user {} — count: {}",
                    userId, memory.getExchangeCount());
        }
        return thresholdReached;
    }

    /**
     * 更新用户的画像内容。
     */
    @Transactional
    public void updateContent(Long userId, String newContent) {
        UserMemory memory = getOrCreate(userId);
        memory.setContent(newContent);
        userMemoryRepository.save(memory);
        log.info("Memory content updated for user {} — len: {}",
                userId, newContent != null ? newContent.length() : 0);
    }

    /**
     * 清除用户的记忆画像（清空内容并重置计数）。
     */
    @Transactional
    public void clear(Long userId) {
        userMemoryRepository.findByUserId(userId).ifPresent(memory -> {
            memory.setContent("");
            memory.setExchangeCount(0);
            userMemoryRepository.save(memory);
            log.info("Memory cleared for user {}", userId);
        });
    }

    /**
     * 异步更新用户记忆画像 — 获取最近对话记录，调用 MiniMax 生成新画像。
     * <p>
     * 此方法为 fire-and-forget：失败仅记录警告，不影响主聊天流程。
     * </p>
     */
    @Async("aiTaskExecutor")
    public void updateMemory(Long userId) {
        try {
            log.info("Starting memory update for user {}", userId);

            // 1. 获取用户最近的 5 轮对话（10 条消息）
            List<AiMessage> recentMessages = aiMessageRepository.findRecentByUserId(userId, 10);
            if (recentMessages.isEmpty()) {
                log.warn("No messages found for memory update — userId: {}", userId);
                return;
            }

            // Reverse so messages are in chronological order (oldest first)
            java.util.Collections.reverse(recentMessages);

            // 2. 获取当前画像内容
            UserMemory currentMemory = getOrCreate(userId);
            String currentPortrait = currentMemory.getContent();

            // 3. 构建 Prompt
            String prompt = buildMemoryUpdatePrompt(currentPortrait, recentMessages);

            // 4. 调用 MiniMax
            String newPortrait = callMinimax(prompt);

            if (newPortrait == null || newPortrait.isBlank()) {
                log.warn("Empty response from MiniMax for memory update — userId: {}", userId);
                return;
            }

            // 5. 保存新画像
            updateContent(userId, newPortrait);
            log.info("Memory update completed for user {} — content len: {}", userId, newPortrait.length());

        } catch (Exception e) {
            log.warn("Failed to update memory for user {}", userId, e);
        }
    }

    // ==================== Private helpers ====================

    /**
     * 构建用户画像更新 Prompt。
     * <p>
     * 优先从 {@link PromptService} 获取模板（classpath:prompts/memory-update.md），
     * 后端可通过 {@code {0}} 和 {@code {1}} 占位符注入当前画像和最近对话。
     * </p>
     */
    private String buildMemoryUpdatePrompt(String currentPortrait, List<AiMessage> recentMessages) {
        // Build conversation text
        StringBuilder conversationSb = new StringBuilder();
        for (AiMessage msg : recentMessages) {
            String role = "user".equals(msg.getRole()) ? "用户" : "助手";
            conversationSb.append("【").append(role).append("】\n").append(msg.getContent()).append("\n\n");
        }

        String conversationText = conversationSb.toString();

        // Get template from PromptService, fallback to hardcoded
        String template = promptService.get("memory-update");
        if (template == null || template.isBlank() || "你是一个情绪记录助手。".equals(template)) {
            // Fallback hardcoded prompt
            StringBuilder sb = new StringBuilder();
            sb.append("你是一个用户画像分析助手。请根据以下用户的最近几轮对话历史，更新该用户的个性化画像描述。\n\n");
            sb.append("画像应包含以下四个方面：\n");
            sb.append("- 情绪特征：用户的情绪模式、易感情绪等\n");
            sb.append("- 关注主题：用户常提及的话题、关心的问题\n");
            sb.append("- 沟通偏好：用户的表达方式、语气特点\n");
            sb.append("- 特别提醒：需要在对话中特别注意的事项\n\n");

            if (currentPortrait != null && !currentPortrait.isBlank()) {
                sb.append("===== 当前画像 =====\n");
                sb.append(currentPortrait).append("\n\n");
            }

            sb.append("===== 最近对话 =====\n");
            sb.append(conversationText);

            sb.append("基于以上对话信息，用中文生成或更新用户画像描述。");
            sb.append("保持简洁准确，每个方面用2-3句话描述。");
            sb.append("直接输出画像内容，不要额外说明。");
            return sb.toString();
        }

        // Use template with placeholders
        String portraitPart = (currentPortrait != null && !currentPortrait.isBlank())
                ? currentPortrait
                : "（暂无）";
        return MessageFormat.format(template, portraitPart, conversationText);
    }

    /**
     * 调用 MiniMax 模型。
     */
    private String callMinimax(String prompt) {
        var response = chatClient.prompt()
                .user(prompt)
                .call()
                .chatResponse();
        return response.getResult().getOutput().getText();
    }
}
