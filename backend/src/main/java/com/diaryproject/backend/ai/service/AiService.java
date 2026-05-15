package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.dto.StructuredReportDTO;
import com.diaryproject.backend.ai.exception.StructuredReportException;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * AI 服务 — 封装 大模型 模型调用
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final ChatModel chatModel;
    private final ChatClient chatClient;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;
    private final PromptService promptService;
    private final AiPromptRecordFormatter recordFormatter;
    private final StructuredReportParser structuredReportParser;

    @Value("${spring.ai.deepseek.chat.options.model}")
    private String bigModel;

    public AiService(ChatModel chatModel, ScheduleRepository scheduleRepository, DiaryRepository diaryRepository,
                     PromptService promptService, AiPromptRecordFormatter recordFormatter,
                     StructuredReportParser structuredReportParser) {
        this.chatModel = chatModel;
        this.chatClient = ChatClient.builder(chatModel).build();
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.promptService = promptService;
        this.recordFormatter = recordFormatter;
        this.structuredReportParser = structuredReportParser;
        log.info("AiService initialized — chatModel: {}, model: {}", chatModel.getClass().getSimpleName(), bigModel);
    }

    /**
     * Phase 0: 基础 Prompt → Response 验证
     */
    public AiDTO.TestPromptResponse testPrompt(String userPrompt) {
        String systemPrompt = """
            你是一个温暖而专业的情绪平衡助手。
            请用中文回复，语气亲切自然。
            """;

        ChatResponse chatResponse = chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .chatResponse();

        String content = chatResponse.getResult().getOutput().getText();
        log.info("大模型 response (len={}): {}", content != null ? content.length() : 0, content);
        log.info("大模型 metadata: {}", chatResponse.getMetadata());

        AiDTO.TestPromptResponse response = new AiDTO.TestPromptResponse();
        response.setModel(bigModel);
        response.setResponse(content);
        response.setStatus("success");
        return response;
    }

    /**
     * Phase 0: Token 消耗估算
     * 发送模拟日程 + 日记数据，测量实际 Token 使用
     */
    public AiDTO.TestPromptResponse estimateTokens(String scheduleJson) {
        String systemPrompt = """
            你是一个情绪分析助手。请根据以下日程数据分析用户的情绪状态。
            输出格式：情绪总结（50字以内）
            """;

        ChatResponse chatResponse = chatClient.prompt()
                .system(systemPrompt)
                .user("以下是我的日程记录：\n" + scheduleJson)
                .call()
                .chatResponse();

        String content = chatResponse.getResult().getOutput().getText();
        log.info("Token estimation response (len={}): {}", content != null ? content.length() : 0, content);
        log.info("Token estimation metadata: {}", chatResponse.getMetadata());

        AiDTO.TestPromptResponse response = new AiDTO.TestPromptResponse();
        response.setModel(bigModel);
        response.setResponse(content);
        response.setStatus("success");
        return response;
    }

    /**
     * Phase 0: 健康检查
     */
    public AiDTO.HealthResponse health() {
        AiDTO.HealthResponse health = new AiDTO.HealthResponse();
        health.setBigModel(bigModel);
        health.setChatModelReady(chatModel != null);
        health.setSpringAiVersion("2.0.0-M6");
        return health;
    }

    /**
     * Phase 2+: 时间范围情绪分析 — 结构化 JSON 输出。
     * 获取指定日期范围内的日程与日记数据，构建结构化 Prompt，调用大模型进行分析。
     * 解析 JSON 报告，校验后返回结构化响应；解析失败时最多重试 3 次。
     */
    @Transactional(readOnly = true)
    public AiDTO.AnalyzeResponse analyzeTimeRange(Long userId, LocalDate startDate, LocalDate endDate) {
        List<Schedule> schedules = scheduleRepository
                .findByUserIdAndDateBetweenOrderByDateAscTimeAsc(userId, startDate, endDate);
        List<Diary> diaries = diaryRepository
                .findByUserIdAndDateBetweenOrderByDateAsc(userId, startDate, endDate);

        if (schedules.isEmpty() && diaries.isEmpty()) {
            throw new ResourceNotFoundException(
                    "在 " + startDate + " 至 " + endDate + " 范围内未找到日程或日记数据");
        }

        // Build valid ID sets
        Set<Long> validScheduleIds = schedules.stream()
                .map(Schedule::getId).collect(Collectors.toSet());
        Set<Long> validDiaryIds = diaries.stream()
                .map(Diary::getId).collect(Collectors.toSet());

        String userPrompt = recordFormatter.formatAnalysisRecords(schedules, diaries);
        String systemPrompt = promptService.get("range-analysis-json");

        // Retry loop: up to 3 retries on parse/validation failure
        int retryCount = 0;
        StructuredReportDTO.StructuredReport parsedReport = null;
        String lastJsonResponse = null;

        while (retryCount <= 3) {
            String promptToSend;
            if (retryCount == 0) {
                promptToSend = userPrompt;
            } else {
                // Build repair prompt
                promptToSend = buildRepairPrompt(userPrompt, lastJsonResponse, retryCount);
            }

            ChatResponse chatResponse = chatClient.prompt()
                    .system(systemPrompt)
                    .user(promptToSend)
                    .call()
                    .chatResponse();

            log.info("大模型 analyze response metadata (attempt {}): {}", retryCount, chatResponse.getMetadata());

            String content = chatResponse.getResult().getOutput().getText();
            if (content == null) {
                log.warn("大模型 returned null content (attempt {})", retryCount);
                retryCount++;
                continue;
            }

            log.info("大模型 analyze response (attempt {}, len={})", retryCount, content.length());
            lastJsonResponse = content;

            try {
                parsedReport = structuredReportParser.parseAndValidate(content, validScheduleIds, validDiaryIds);
                break; // success
            } catch (StructuredReportException e) {
                log.warn("Report parse/validation failed (attempt {}): {}", retryCount, e.getMessage());
                retryCount++;
                if (retryCount > 3) {
                    throw new StructuredReportException("Failed after 3 retries: " + e.getMessage(), e);
                }
            }
        }

        if (parsedReport == null) {
            throw new StructuredReportException("Failed after all retry attempts");
        }

        // Build evidence summary from fetched records
        StructuredReportDTO.EvidenceSummary evidenceSummary = buildEvidenceSummary(schedules, diaries);

        // Generate markdown summary for backward compatibility (session history)
        String markdown = generateMarkdownSummary(parsedReport);

        // Build response
        AiDTO.AnalyzeResponse response = new AiDTO.AnalyzeResponse();
        response.setStructured(true);
        response.setSchemaVersion("1.0");
        response.setRetryCount(retryCount);
        response.setReport(parsedReport);
        response.setEvidenceSummary(evidenceSummary);
        response.setMarkdown(markdown);
        response.setScheduleCount(schedules.size());
        response.setDiaryCount(diaries.size());
        response.setDateRange(startDate + " ~ " + endDate);
        return response;
    }

    /**
     * 构建修复提示 — 告诉模型上次 JSON 有问题，请修复。
     */
    private String buildRepairPrompt(String originalPrompt, String lastResponse, int attempt) {
        return originalPrompt + "\n\n---\n"
                + "【重要】你上一次的输出 JSON 格式有误，无法解析。请严格按照 JSON Schema 重新输出。\n"
                + "这是第 " + attempt + " 次重试。请确保：\n"
                + "1. 只输出纯 JSON，不要包裹在 markdown 代码块中\n"
                + "2. 所有枚举值严格使用指定选项\n"
                + "3. scheduleIds 和 diaryIds 只使用输入数据中的 ID\n"
                + "4. 所有必填字段都不能缺失\n"
                + "5. 字符串长度不能超过限制";
    }

    /**
     * 从数据库记录构建证据摘要。
     */
    private StructuredReportDTO.EvidenceSummary buildEvidenceSummary(List<Schedule> schedules, List<Diary> diaries) {
        List<StructuredReportDTO.ScheduleEvidence> scheduleEvidence = new ArrayList<>();
        for (Schedule s : schedules) {
            StructuredReportDTO.ScheduleEvidence se = new StructuredReportDTO.ScheduleEvidence();
            se.setId(s.getId());
            se.setDate(s.getDate() != null ? s.getDate().toString() : null);
            se.setTime(s.getTime() != null ? s.getTime().format(DateTimeFormatter.ofPattern("HH:mm")) : null);
            se.setTitle(s.getTitle());
            se.setFeeling(s.getFeeling());
            scheduleEvidence.add(se);
        }

        List<StructuredReportDTO.DiaryEvidence> diaryEvidence = new ArrayList<>();
        for (Diary d : diaries) {
            StructuredReportDTO.DiaryEvidence de = new StructuredReportDTO.DiaryEvidence();
            de.setId(d.getId());
            de.setDate(d.getDate() != null ? d.getDate().toString() : null);
            de.setTitle(d.getTitle());
            String excerpt = d.getContent();
            if (excerpt != null && excerpt.length() > 120) {
                excerpt = excerpt.substring(0, 120);
            }
            de.setExcerpt(excerpt);
            diaryEvidence.add(de);
        }

        StructuredReportDTO.EvidenceSummary summary = new StructuredReportDTO.EvidenceSummary();
        summary.setSchedules(scheduleEvidence);
        summary.setDiaries(diaryEvidence);
        return summary;
    }

    /**
     * 从结构化报告生成 Markdown 摘要（用于会话历史兼容）。
     */
    private String generateMarkdownSummary(StructuredReportDTO.StructuredReport report) {
        StringBuilder md = new StringBuilder();
        md.append("# ").append(report.getTitle()).append("\n\n");

        if (report.getOverview() != null) {
            md.append("## 概述\n");
            md.append("**").append(report.getOverview().getHeadline()).append("**\n\n");
            md.append(report.getOverview().getSummary()).append("\n\n");
        }

        if (report.getTrend() != null) {
            md.append("## 情绪趋势\n");
            md.append("- 方向：").append(report.getTrend().getDirection()).append("\n");
            md.append("- 波动：").append(report.getTrend().getVolatility()).append("\n");
            if (report.getTrend().getHighlights() != null) {
                for (String h : report.getTrend().getHighlights()) {
                    md.append("- ").append(h).append("\n");
                }
            }
            md.append("\n");
        }

        if (report.getPatterns() != null && !report.getPatterns().isEmpty()) {
            md.append("## 发现模式\n");
            for (StructuredReportDTO.Pattern p : report.getPatterns()) {
                md.append("### ").append(p.getTitle()).append("\n");
                md.append(p.getDescription()).append("\n\n");
            }
        }

        if (report.getTurningPoints() != null && !report.getTurningPoints().isEmpty()) {
            md.append("## 关键转折\n");
            for (StructuredReportDTO.TurningPoint tp : report.getTurningPoints()) {
                md.append("- **").append(tp.getDate()).append("** ").append(tp.getTitle()).append("：").append(tp.getReason()).append("\n");
            }
            md.append("\n");
        }

        if (report.getSuggestions() != null && !report.getSuggestions().isEmpty()) {
            md.append("## 建议\n");
            for (StructuredReportDTO.Suggestion s : report.getSuggestions()) {
                md.append("- **").append(s.getTitle()).append("**：").append(s.getAction()).append(" (").append(s.getDifficulty()).append(")\n");
            }
            md.append("\n");
        }

        if (report.getGentleNote() != null) {
            md.append("> ").append(report.getGentleNote()).append("\n\n");
        }

        md.append("---\n*以上分析由AI生成，仅供参考 ❤️*");
        return md.toString();
    }

}
