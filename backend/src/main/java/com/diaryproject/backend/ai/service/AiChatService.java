package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
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
    private final ChatClient chatClient;

    public AiChatService(AiSessionRepository aiSessionRepository,
                         AiMessageRepository aiMessageRepository,
                         ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
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

        // 5. 构建 ChatClient 消息列表
        String systemPrompt = """
                你是一个温暖而专业的情绪平衡助手，名字叫"小七"。
                你会收到用户的日程记录（包含情绪值 -3 到 +3）和日记文本。
                你的职责是：
                1. 情绪分析 — 识别情绪波动模式，像朋友一样娓娓道来
                2. 洞察建议 — 结合日程内容给出温和的建议
                3. 情感支持 — 情绪低落时先共情再分析
                核心原则：只基于提供的数据说话，绝不捏造信息。语气温和亲切。永远不要给出医疗建议或诊断。结尾加上："以上分析由AI生成，仅供参考 ❤️"
                """;

        List<org.springframework.ai.chat.messages.Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));

        for (AiMessage msg : contextMessages) {
            if ("user".equals(msg.getRole())) {
                messages.add(new UserMessage(msg.getContent()));
            } else if ("assistant".equals(msg.getRole())) {
                messages.add(new AssistantMessage(msg.getContent()));
            }
        }

        // 6-7. 创建 SseEmitter 并订阅流式响应
        SseEmitter sseEmitter = new SseEmitter(300_000L);
        StringBuilder fullResponse = new StringBuilder();

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
                            log.error("流式响应异常 — sessionId: {}", sessionId, error);
                            try {
                                sseEmitter.completeWithError(error);
                            } catch (Exception ignored) {
                                // 忽略 completeWithError 的二次异常
                            }
                        },
                        () -> {
                            try {
                                String responseText = fullResponse.toString();
                                if (!responseText.isEmpty()) {
                                    saveAssistantMessage(sessionId, seq + 1, responseText);
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
     * 保存助手的回复消息到数据库（独立事务，避免 Flux 回调中的事务问题）
     */
    @Transactional
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
}
