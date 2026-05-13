package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.diary.service.DiaryService;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * AI 聊天服务 — 处理用户与"小七"的实时对话（SSE 流式响应）
 */
@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final DiaryRepository diaryRepository;
    private final DiaryService diaryService;
    private final AiSessionService aiSessionService;
    private final PromptService promptService;
    private final MemoryService memoryService;
    private final AiDiarySummaryParser diarySummaryParser;
    private final AiConversationBuilder conversationBuilder;
    private final AiChatContextBlockBuilder contextBlockBuilder;
    private final AiChatSystemPromptBuilder systemPromptBuilder;
    private final AiTitleGenerationService titleGenerationService;
    private final ChatClient chatClient;

    public AiChatService(AiSessionRepository aiSessionRepository,
                         AiMessageRepository aiMessageRepository,
                         DiaryRepository diaryRepository,
                         DiaryService diaryService,
                         AiSessionService aiSessionService,
                         PromptService promptService,
                         MemoryService memoryService,
                         AiDiarySummaryParser diarySummaryParser,
                         AiConversationBuilder conversationBuilder,
                         AiChatContextBlockBuilder contextBlockBuilder,
                         AiChatSystemPromptBuilder systemPromptBuilder,
                         AiTitleGenerationService titleGenerationService,
                         ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.diaryRepository = diaryRepository;
        this.diaryService = diaryService;
        this.aiSessionService = aiSessionService;
        this.promptService = promptService;
        this.memoryService = memoryService;
        this.diarySummaryParser = diarySummaryParser;
        this.conversationBuilder = conversationBuilder;
        this.contextBlockBuilder = contextBlockBuilder;
        this.systemPromptBuilder = systemPromptBuilder;
        this.titleGenerationService = titleGenerationService;
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
        contextMessages = conversationBuilder.recentWindow(contextMessages, 40);

        // 5. 加载上下文选择条目（日程/日记），构建上下文数据块
        String contextBlock = contextBlockBuilder.build(sessionId);

        // 6. 构建 ChatClient 消息列表
        String systemPrompt = systemPromptBuilder.build(userId);
        List<org.springframework.ai.chat.messages.Message> messages =
                conversationBuilder.buildChatMessages(systemPrompt, contextMessages, contextBlock);

        // 6-7. 创建 SseEmitter 并订阅流式响应
        SseEmitter sseEmitter = new SseEmitter(300_000L);
        StringBuilder fullResponse = new StringBuilder();
        final int messageCount = messages.size();
        final long startNanos = System.nanoTime();

        log.info("▶ 开始 大模型 流式请求 — sessionId: {}, messages: {}, tokens~: {}",
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
                            log.error("✕ 大模型 流式异常 — sessionId: {}, elapsed: {}ms, error: {}",
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
                                    log.info("✓ 大模型 流完成 — sessionId: {}, chunks: {}, 长度: {}, 耗时: {}ms",
                                            sessionId, fullResponse.length(), responseText.length(), elapsedMs);
                                    saveAssistantMessage(sessionId, seq + 1, responseText);

                                    // Async auto-title generation after first exchange
                                    titleGenerationService.generateTitle(sessionId, userMessage, responseText);

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
                                    log.warn("⚠ 大模型 返回空响应 — sessionId: {}, 耗时: {}ms. 可能原因: API key 无效/模型不可用/网络问题",
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
     * 将对话总结为回顾日记 — 调用 AI 生成标题和内容，创建或更新日记条目。
     * <p>
     * 如果会话已有关联日记（diaryId 不为空），则更新该日记；否则创建新日记。
     * 日记日期取当前日期。
     * </p>
     *
     * @param userId    用户 ID
     * @param sessionId 会话 ID
     * @return 包含日记 ID 和日期的响应
     */
    @Transactional
    public AiDTO.SummarizeResponse summarizeToDiary(Long userId, Long sessionId) {
        // 1. Validate session ownership
        com.diaryproject.backend.ai.entity.AiSession session = aiSessionRepository
                .findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI 会话", sessionId));

        // 2. Get all messages for the session
        List<AiMessage> messages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        if (messages.isEmpty()) {
            throw new IllegalArgumentException("会话无消息，无法生成日记");
        }

        // 3. Build conversation text for AI
        String conversation = conversationBuilder.buildTranscript(messages);

        // 4. Call AI to summarize
        String systemPrompt = promptService.get("summarize-conversation");
        String aiResponse = chatClient.prompt()
                .system(systemPrompt)
                .user(conversation)
                .call()
                .chatResponse()
                .getResult()
                .getOutput()
                .getText();

        if (aiResponse == null || aiResponse.isBlank()) {
            throw new IllegalStateException("AI 总结失败，请稍后重试");
        }

        AiDiarySummaryParser.ParsedSummary parsedSummary = diarySummaryParser.parse(aiResponse);
        String title = parsedSummary.title();
        String content = parsedSummary.content();

        LocalDate today = LocalDate.now();
        boolean updated;

        // 6. Create or update diary
        if (session.getDiaryId() != null) {
            // Update existing diary
            Diary diary = diaryRepository.findByUserIdAndId(userId, session.getDiaryId())
                    .orElse(null);
            if (diary == null) {
                // Diary was deleted externally — create new
                DiaryDTO.CreateRequest createReq = new DiaryDTO.CreateRequest();
                createReq.setTitle(title);
                createReq.setContent(content);
                createReq.setDate(today);
                DiaryDTO.Response created = diaryService.create(userId, createReq);
                session.setDiaryId(created.getId());
                aiSessionRepository.save(session);
                updated = false;
            } else {
                diary.setTitle(title);
                diary.setContent(content);
                diaryRepository.save(diary);
                log.info("更新日记 — diaryId: {}, sessionId: {}", diary.getId(), sessionId);
                updated = true;
            }
        } else {
            // Create new diary
            DiaryDTO.CreateRequest createReq = new DiaryDTO.CreateRequest();
            createReq.setTitle(title);
            createReq.setContent(content);
            createReq.setDate(today);
            DiaryDTO.Response created = diaryService.create(userId, createReq);
            session.setDiaryId(created.getId());
            aiSessionRepository.save(session);
            log.info("创建日记 — diaryId: {}, sessionId: {}", created.getId(), sessionId);
            updated = false;
        }

        AiDTO.SummarizeResponse response = new AiDTO.SummarizeResponse();
        response.setDiaryId(session.getDiaryId());
        response.setDiaryDate(today.toString());
        response.setUpdated(updated);
        return response;
    }

}
