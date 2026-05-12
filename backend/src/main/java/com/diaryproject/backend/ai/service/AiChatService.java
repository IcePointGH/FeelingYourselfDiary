package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.ai.entity.UserMemory;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.List;

/**
 * AI 聊天服务 — 处理用户与"小七"的实时对话（SSE 流式响应）
 */
@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final AiSessionScheduleRepository aiSessionScheduleRepository;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;
    private final AiSessionService aiSessionService;
    private final PromptService promptService;
    private final MemoryService memoryService;
    private final ChatClient chatClient;

    public AiChatService(AiSessionRepository aiSessionRepository,
                         AiMessageRepository aiMessageRepository,
                         AiSessionScheduleRepository aiSessionScheduleRepository,
                         ScheduleRepository scheduleRepository,
                         DiaryRepository diaryRepository,
                         AiSessionService aiSessionService,
                         PromptService promptService,
                         MemoryService memoryService,
                         ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.aiSessionScheduleRepository = aiSessionScheduleRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.aiSessionService = aiSessionService;
        this.promptService = promptService;
        this.memoryService = memoryService;
        this.chatClient = ChatClient.builder(chatModel).build();
        log.info("AiChatService initialized — chatModel: {}", chatModel.getClass().getSimpleName());
    }

    /**
     * 流式聊天 — 保存用户消息 → 加载上下文 → SSE 流式响应 → 保存助手回复
     *
     * @param userId      用户 ID
     * @param sessionId   会话 ID
     * @param userMessage 用户消息内容
     * @return SseEmitter 流式响应
     */
    public SseEmitter chat(Long userId, Long sessionId, String userMessage) {
        // 1. 验证会话属于当前用户
        aiSessionRepository.findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI 会话", sessionId));

        // 2. 获取下一个序号
        List<AiMessage> allMessages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        int seq = allMessages.size() + 1;

        // 3. 保存用户消息
        AiMessage userMsg = AiMessage.builder()
                .sessionId(sessionId)
                .role("user")
                .content(userMessage)
                .sequenceNum(seq)
                .build();
        aiMessageRepository.save(userMsg);
        log.info("用户消息已保存 — sessionId: {}, seq: {}", sessionId, seq);

        // 4. 重新获取完整消息列表（含刚保存的用户消息），取最近 40 条（20 轮对话）
        List<AiMessage> contextMessages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        if (contextMessages.size() > 40) {
            contextMessages = contextMessages.subList(contextMessages.size() - 40, contextMessages.size());
        }

        // 5. 加载上下文选择条目（日程/日记），构建上下文数据块
        String contextBlock = buildContextBlock(sessionId);

        // 6. 构建 ChatClient 消息列表
        String systemPrompt = """
                你是一个温暖而专业的情绪平衡助手，名字叫"小七"。
                你会收到用户的日程记录（包含情绪值 -3 到 +3）和日记文本。
                你的职责是：
                1. 情绪分析 — 识别情绪波动模式，像朋友一样娓娓道来
                2. 洞察建议 — 结合日程内容给出温和的建议
                3. 情感支持 — 情绪低落时先共情再分析
                核心原则：只基于提供的数据说话，绝不捏造信息。语气温和亲切。永远不要给出医疗建议或诊断。结尾加上："以上分析由AI生成，仅供参考 ❤️"
                """;

        // 注入用户记忆画像（如果存在）
        try {
            UserMemory memory = memoryService.getOrCreate(userId);
            if (memory.getContent() != null && !memory.getContent().isBlank()) {
                systemPrompt = systemPrompt + "\n\n## 关于用户（基于历史对话分析）\n" + memory.getContent();
                log.debug("User memory injected into system prompt — userId: {}", userId);
            }
        } catch (Exception e) {
            log.warn("Failed to load user memory for prompt injection — userId: {}", userId, e);
        }

        List<org.springframework.ai.chat.messages.Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));

        for (int i = 0; i < contextMessages.size(); i++) {
            AiMessage msg = contextMessages.get(i);
            if ("user".equals(msg.getRole())) {
                String content = msg.getContent();
                // Augment the most recent user message (the one just sent) with context data
                if (contextBlock != null && i == contextMessages.size() - 1) {
                    content = contextBlock + "\n\n---\n\n" + content;
                }
                messages.add(new UserMessage(content));
            } else if ("assistant".equals(msg.getRole())) {
                messages.add(new AssistantMessage(msg.getContent()));
            }
        }

        // 6-7. 创建 SseEmitter 并订阅流式响应
        SseEmitter sseEmitter = new SseEmitter(300_000L);
        StringBuilder fullResponse = new StringBuilder();
        final int messageCount = messages.size();
        final long startNanos = System.nanoTime();

        log.info("▶ 开始 MiniMax 流式请求 — sessionId: {}, messages: {}, tokens~: {}",
                sessionId, messageCount, estimateTokens(messages));

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
                                log.error("SSE 发送失败 — sessionId: {}", sessionId, e);
                            }
                        },
                        error -> {
                            long elapsed = (System.nanoTime() - startNanos) / 1_000_000;
                            log.error("✕ MiniMax 流式异常 — sessionId: {}, elapsed: {}ms, error: {}",
                                    sessionId, elapsed, error.toString(), error);
                            try {
                                sseEmitter.completeWithError(error);
                            } catch (Exception ignored) {
                                // 忽略 completeWithError 的二次异常
                            }
                        },
                        () -> {
                            try {
                                long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
                                String responseText = fullResponse.toString();
                                if (!responseText.isEmpty()) {
                                    log.info("✓ MiniMax 流完成 — sessionId: {}, chunks: {}, 长度: {}, 耗时: {}ms",
                                            sessionId, fullResponse.length(), responseText.length(), elapsedMs);
                                    saveAssistantMessage(sessionId, seq + 1, responseText);

                                    // Async auto-title generation after first exchange
                                    generateTitle(sessionId, userMessage, responseText);

                                    // Increment exchange count and trigger memory update if threshold reached
                                    try {
                                        if (memoryService.incrementExchange(userId)) {
                                            log.info("Memory threshold reached, triggering async update for user {}", userId);
                                            memoryService.updateMemory(userId);
                                        }
                                    } catch (Exception memEx) {
                                        log.warn("Memory exchange counting failed — userId: {}", userId, memEx);
                                    }
                                } else {
                                    log.warn("⚠ MiniMax 返回空响应 — sessionId: {}, 耗时: {}ms. 可能原因: API key 无效/模型不可用/网络问题",
                                            sessionId, elapsedMs);
                                }
                                sseEmitter.complete();
                            } catch (Exception e) {
                                log.error("流式响应完成处理异常 — sessionId: {}", sessionId, e);
                                try {
                                    sseEmitter.completeWithError(e);
                                } catch (Exception ignored) {
                                }
                            }
                        }
                );

        return sseEmitter;
    }

    /**
     * 粗粒度 token 估算（中文 ~1.5 字符/token，英文 ~4 字符/token）
     */
    private int estimateTokens(List<org.springframework.ai.chat.messages.Message> messages) {
        int total = 0;
        for (org.springframework.ai.chat.messages.Message m : messages) {
            String text = m.getText();
            if (text != null) total += text.length() * 2 / 3;
        }
        return total;
    }

    /**
     * 保存助手的回复消息到数据库。
     * <p>注意：此方法从 {@link #chat} 的 onComplete 回调中通过自调用执行，
     * 因此 {@code @Transactional} 不生效（Spring AOP 不拦截自调用）。
     * DB 写入依赖 {@code JpaRepository.save()} 的内置事务。</p>
     */
    public void saveAssistantMessage(Long sessionId, int sequenceNum, String content) {
        AiMessage assistantMsg = AiMessage.builder()
                .sessionId(sessionId)
                .role("assistant")
                .content(content)
                .sequenceNum(sequenceNum)
                .build();
        aiMessageRepository.save(assistantMsg);
        log.info("助手消息已保存 — sessionId: {}, seq: {}, len: {}", sessionId, sequenceNum, content.length());
    }

    /**
     * 构建上下文数据块（用户选择的日程/日记数据）
     * 返回 null 表示没有已选上下文
     */
    private String buildContextBlock(Long sessionId) {
        List<AiSessionSchedule> contextEntries = aiSessionScheduleRepository.findBySessionId(sessionId);
        if (contextEntries.isEmpty()) {
            return null;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("以下是我选取的需要分析的数据：\n\n");

        for (AiSessionSchedule entry : contextEntries) {
            if (entry.getTag() != null && !entry.getTag().isBlank()) {
                sb.append("【标签：").append(entry.getTag()).append("】\n");
            }

            if (entry.getScheduleId() != null) {
                scheduleRepository.findById(entry.getScheduleId()).ifPresent(s -> {
                    sb.append("【").append(s.getDate()).append("】");
                    if (s.getTime() != null) {
                        sb.append(" ").append(s.getTime());
                    }
                    sb.append("\n  标题：").append(s.getTitle());
                    sb.append("\n  情绪：").append(s.getFeeling()).append(" (").append(getFeelingLabel(s.getFeeling())).append(")");
                    if (s.getDescription() != null && !s.getDescription().isBlank()) {
                        sb.append("\n  描述：").append(s.getDescription());
                    }
                    sb.append("\n\n");
                });
            } else if (entry.getDiaryId() != null) {
                diaryRepository.findById(entry.getDiaryId()).ifPresent(d -> {
                    sb.append("【").append(d.getDate()).append("】");
                    sb.append("\n  标题：").append(d.getTitle());
                    sb.append("\n  内容：").append(d.getContent());
                    sb.append("\n\n");
                });
            }
        }

        String result = sb.toString();
        log.info("上下文数据块已构建 — sessionId: {}, entries: {}, len: {}", sessionId, contextEntries.size(), result.length());
        return result;
    }

    /**
     * 将情绪值映射为中文标签
     */
    private String getFeelingLabel(int feeling) {
        switch (feeling) {
            case -3: return "极差";
            case -2: return "较差";
            case -1: return "略差";
            case 0:  return "一般";
            case 1:  return "略好";
            case 2:  return "较好";
            case 3:  return "极好";
            default: return "未知";
        }
    }

    /**
     * 异步生成会话标题 — 在第一轮对话完成后调用。
     * <p>
     * 条件：会话标题为"新对话"且消息数为 2（用户 + 助手各一条）。
     * 调用 MiniMax 总结主题，生成 ≤15 字的标题，通过 renameSession 更新。
     * 失败时静默保留默认标题。
     * </p>
     *
     * @param sessionId        会话 ID
     * @param firstUserMsg     第一轮用户消息
     * @param firstAssistantMsg 第一轮助手回复
     */
    @Async("aiTaskExecutor")
    public void generateTitle(Long sessionId, String firstUserMsg, String firstAssistantMsg) {
        try {
            // Only generate title for sessions with default title "新对话"
            com.diaryproject.backend.ai.entity.AiSession session = aiSessionRepository.findById(sessionId).orElse(null);
            if (session == null) {
                log.warn("generateTitle: session not found — sessionId: {}", sessionId);
                return;
            }

            // Check condition: title is "新对话" AND this is the first complete exchange
            if (!"新对话".equals(session.getTitle())) {
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
                log.warn("auto-title: empty response from MiniMax — sessionId: {}", sessionId);
                return;
            }

            // Clean up: trim, remove quotes, limit to 15 characters
            String title = response.trim();
            // Remove surrounding quotes if present
            if ((title.startsWith("\"") && title.endsWith("\""))
                    || (title.startsWith("'") && title.endsWith("'"))) {
                title = title.substring(1, title.length() - 1);
            }
            title = title.trim();
            if (title.length() > 15) {
                title = title.substring(0, 15);
            }

            aiSessionService.renameSession(sessionId, title);
            log.info("auto-title: session {} renamed to \"{}\"", sessionId, title);

        } catch (Exception e) {
            log.warn("auto-title: failed to generate title for sessionId: {}", sessionId, e);
        }
    }
}
