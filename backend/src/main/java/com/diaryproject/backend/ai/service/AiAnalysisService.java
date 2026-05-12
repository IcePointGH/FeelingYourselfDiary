package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
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
 * 将大量数据分块后逐一调用 MiniMax 分析，最后合成汇总报告。
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
    private final ChatClient chatClient;

    public AiAnalysisService(AiSessionRepository aiSessionRepository,
                             AiMessageRepository aiMessageRepository,
                             ScheduleRepository scheduleRepository,
                             DiaryRepository diaryRepository,
                             HistoryChunkingService chunkingService,
                             ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.chunkingService = chunkingService;
        this.chatClient = ChatClient.builder(chatModel).build();
        log.info("AiAnalysisService initialized — chatModel: {}", chatModel.getClass().getSimpleName());
    }

    /**
     * 异步执行全量历史分析。
     * <ol>
     *   <li>设置会话状态为 "processing", progress = 0</li>
     *   <li>获取用户全部日程与日记数据</li>
     *   <li>无数据时直接完成并写入提示消息</li>
     *   <li>调用 {@link HistoryChunkingService#chunk} 分块</li>
     *   <li>逐块调用 MiniMax 分析</li>
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
            aiSessionRepository.save(session);

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

            String systemPrompt = """
                    你是一个温暖而专业的情绪平衡助手，名字叫"小七"。
                    你会收到用户一段时间内的全部历史日程记录和日记文本。
                    请根据以下数据对用户在该时间段内的情绪状态进行全面分析：
                    1. 整体情绪趋势 — 用户的情绪整体如何？波动大吗？
                    2. 主要情绪事件 — 哪些日子或事件明显影响了情绪？
                    3. 综合建议 — 针对用户的情绪模式给出温和的建议。
                    核心原则：只基于提供的数据说话，绝不捏造信息。语气温和亲切。永远不要给出医疗建议或诊断。
                    """;

            int totalChunks = chunks.size();

            for (int i = 0; i < totalChunks; i++) {
                HistoryChunkingService.Chunk chunk = chunks.get(i);

                String userPrompt = buildUserPrompt(chunk.getSchedules(), chunk.getDiaries());
                String response = callMiniMax(systemPrompt, userPrompt);

                int seqNum = i + 1;
                saveAssistantMessage(sessionId, seqNum, "assistant", response);

                // 更新进度
                int progress = (i + 1) * 100 / totalChunks;
                session.setProgress(progress);
                session.setStatus("processing");
                aiSessionRepository.save(session);

                log.debug("分块分析完成 [{}/{}] — progress: {}%", i + 1, totalChunks, progress);
            }

            // 5. 多块汇总：将所有分析结果合成一份整体报告
            if (totalChunks > 1) {
                String summaryPrompt = "请根据以上对用户全部历史情绪数据的分析结果，"
                        + "给出一个简洁的整体总结（300字以内），涵盖主要情绪趋势和核心建议。";
                String summary = callMiniMax(systemPrompt, summaryPrompt);

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
     * 调用 MiniMax 模型。包级可见以便测试时 stub。
     */
    String callMiniMax(String systemPrompt, String userPrompt) {
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
        StringBuilder sb = new StringBuilder();
        sb.append("以下是我在指定时间范围内的记录，请帮我分析：\n\n");

        if (schedules != null && !schedules.isEmpty()) {
            sb.append("===== 日程记录 =====\n");
            for (Schedule s : schedules) {
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
            }
        }

        if (diaries != null && !diaries.isEmpty()) {
            sb.append("===== 日记记录 =====\n");
            for (Diary d : diaries) {
                sb.append("【").append(d.getDate()).append("】");
                sb.append("\n  标题：").append(d.getTitle());
                sb.append("\n  内容：").append(d.getContent());
                sb.append("\n\n");
            }
        }

        return sb.toString();
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
}
