package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * AI 全量历史分析服务 — Mode 3: 分析用户全部日程与日记数据.
 * <p>
 * 异步执行 {@link #analyzeFullHistory(Long, Long)}，通过 {@link HistoryChunkingService}
 * 将大量数据分块后逐一调用 大模型 分析，最后合成汇总报告。
 * 前端通过轮询会话详情接口获取进度 ({@code progress}) 和状态 ({@code status})。
 * </p>
 *
 * <h3>状态流转</h3>
 * <pre>
 * active → processing → completed
 *                       → failed (异常时)
 * </pre>
 */
@Service
public class AiAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AiAnalysisService.class);

    private static final int MAX_TOKENS_PER_CHUNK = 2500;

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;
    private final HistoryChunkingService chunkingService;
    private final PromptService promptService;
    private final ChatClient chatClient;
    private final AiPromptRecordFormatter recordFormatter;

    @Autowired
    public AiAnalysisService(AiSessionRepository aiSessionRepository,
                             AiMessageRepository aiMessageRepository,
                             ScheduleRepository scheduleRepository,
                             DiaryRepository diaryRepository,
                             HistoryChunkingService chunkingService,
                             PromptService promptService,
                             ChatModel chatModel,
                             AiPromptRecordFormatter recordFormatter) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.chunkingService = chunkingService;
        this.promptService = promptService;
        this.chatClient = ChatClient.builder(chatModel).build();
        this.recordFormatter = recordFormatter;
        log.info("AiAnalysisService initialized — chatModel: {}", chatModel.getClass().getSimpleName());
    }

    AiAnalysisService(AiSessionRepository aiSessionRepository,
                      AiMessageRepository aiMessageRepository,
                      ScheduleRepository scheduleRepository,
                      DiaryRepository diaryRepository,
                      HistoryChunkingService chunkingService,
                      PromptService promptService,
                      ChatModel chatModel) {
        this(aiSessionRepository, aiMessageRepository, scheduleRepository, diaryRepository,
                chunkingService, promptService, chatModel, new AiPromptRecordFormatter());
    }

    /**
     * 异步执行全量历史分析。
     * <ol>
     *   <li>设置会话状态为 "processing", progress = 0</li>
     *   <li>获取用户全部日程与日记数据</li>
     *   <li>无数据时直接完成并写入提示消息</li>
     *   <li>调用 {@link HistoryChunkingService#chunk} 分块</li>
     *   <li>逐块调用 大模型 分析</li>
     *   <li>多块时合成汇总报告</li>
     *   <li>设置状态为 "completed" 或 "failed"</li>
     * </ol>
     *
     * @param userId   用户 ID
     * @param sessionId 会话 ID
     */
    @Async("aiTaskExecutor")
    public void analyzeFullHistory(Long userId, Long sessionId) {
        log.info("全量历史分析开始 — userId: {}, sessionId: {}", userId, sessionId);

        AiSession session = null;
        try {
            // 1. 获取会话并设置为处理中
            session = aiSessionRepository.findByUserIdAndId(userId, sessionId)
                    .orElseThrow(() -> new RuntimeException("AI 会话未找到: " + sessionId));
            session.setStatus("processing");
            session.setProgress(0);
            session = aiSessionRepository.save(session);

            // 2. 获取用户全部数据（按日期升序排列）
            List<Schedule> allSchedules = scheduleRepository.findByUserIdOrderByDateDescTimeDesc(userId);
            List<Diary> allDiaries = diaryRepository.findByUserIdOrderByDateDesc(userId);
            Collections.reverse(allSchedules);
            Collections.reverse(allDiaries);

            // 3. 无数据处理
            if (allSchedules.isEmpty() && allDiaries.isEmpty()) {
                String infoMsg = "暂无日程和日记数据可供分析。请添加一些记录后再试。";
                saveAssistantMessage(sessionId, 1, "system", infoMsg);

                session.setStatus("completed");
                session.setProgress(100);
                aiSessionRepository.save(session);
                log.info("全量历史分析完成（无数据） — userId: {}, sessionId: {}", userId, sessionId);
                return;
            }

            // 4. 分块处理
            List<HistoryChunkingService.Chunk> chunks = chunkingService.chunk(
                    allSchedules, allDiaries, MAX_TOKENS_PER_CHUNK);

            String systemPrompt = promptService.get("full-analysis");

            int totalChunks = chunks.size();

            for (int i = 0; i < totalChunks; i++) {
                HistoryChunkingService.Chunk chunk = chunks.get(i);

                String userPrompt = buildUserPrompt(chunk.getSchedules(), chunk.getDiaries());
                String response = callModel(systemPrompt, userPrompt);

                int seqNum = i + 1;
                saveAssistantMessage(sessionId, seqNum, "assistant", response);

                // 更新进度
                int progress = (i + 1) * 100 / totalChunks;
                session.setProgress(progress);
                session.setStatus("processing");
                session = aiSessionRepository.save(session);

                log.debug("分块分析完成 [{}/{}] — progress: {}%", i + 1, totalChunks, progress);
            }

            // 5. 多块汇总：将所有分析结果合成一份整体报告
            if (totalChunks > 1) {
                String summaryPrompt = "请根据以上对用户全部历史情绪数据的分析结果，"
                        + "给出一个简洁的整体总结（300字以内），涵盖主要情绪趋势和核心建议。";
                String summary = callModel(systemPrompt, summaryPrompt);

                int seqNum = totalChunks + 1;
                saveAssistantMessage(sessionId, seqNum, "assistant",
                        "===== 全量历史分析汇总 =====\n\n" + summary);
            }

            // 6. 标记完成
            session.setStatus("completed");
            session.setProgress(100);
            aiSessionRepository.save(session);
            log.info("全量历史分析完成 — userId: {}, sessionId: {}, chunks: {}", userId, sessionId, totalChunks);

        } catch (Exception e) {
            log.error("全量历史分析失败 — userId: {}, sessionId: {}", userId, sessionId, e);
            if (session != null) {
                try {
                    session.setStatus("failed");
                    aiSessionRepository.save(session);
                    saveAssistantMessage(sessionId, 0, "system", "分析失败: " + e.getMessage());
                } catch (Exception inner) {
                    log.error("保存失败状态时出错 — userId: {}, sessionId: {}", userId, sessionId, inner);
                }
            }
        }
    }

    // ==================== Package-private for testability ====================

    /**
     * 调用 AI 大模型。包级可见以便测试时 stub。
     */
    String callModel(String systemPrompt, String userPrompt) {
        ChatResponse cr = chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .chatResponse();
        return cr.getResult().getOutput().getText();
    }

    /**
     * 构建用户提示文本（含日程和日记数据）。包级可见以便测试时 stub。
     */
    String buildUserPrompt(List<Schedule> schedules, List<Diary> diaries) {
        return recordFormatter.formatAnalysisRecords(schedules, diaries);
    }

    // ==================== Private helpers ====================

    private void saveAssistantMessage(Long sessionId, int sequenceNum, String role, String content) {
        AiMessage msg = AiMessage.builder()
                .sessionId(sessionId)
                .role(role)
                .content(content)
                .sequenceNum(sequenceNum)
                .build();
        aiMessageRepository.save(msg);
        log.debug("助手消息已保存 — sessionId: {}, seq: {}, role: {}, len: {}", sessionId, sequenceNum, role, content.length());
    }
}
