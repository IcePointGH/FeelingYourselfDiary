package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.AiDTO;
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
import java.util.List;
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

    @Value("${spring.ai.minimax.chat.options.model}")
    private String bigModel;

    public AiService(ChatModel chatModel, ScheduleRepository scheduleRepository, DiaryRepository diaryRepository,
                     PromptService promptService, AiPromptRecordFormatter recordFormatter) {
        this.chatModel = chatModel;
        this.chatClient = ChatClient.builder(chatModel).build();
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.promptService = promptService;
        this.recordFormatter = recordFormatter;
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
     * Phase 2: 时间范围情绪分析
     * 获取指定日期范围内的日程与日记数据，构建结构化 Prompt，调用 大模型 进行分析。
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

        String userPrompt = recordFormatter.formatAnalysisRecords(schedules, diaries);

        String systemPrompt = promptService.get("range-analysis");

        ChatResponse chatResponse = chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .chatResponse();

        // Log token usage from response metadata
        log.info("大模型 analyze response metadata: {}", chatResponse.getMetadata());

        String content = chatResponse.getResult().getOutput().getText();
        if (content == null) {
            log.error("大模型 returned null content for analyzeTimeRange request");
            AiDTO.AnalyzeResponse errorResponse = new AiDTO.AnalyzeResponse();
            errorResponse.setMarkdown("AI 分析暂时不可用，请稍后重试。");
            errorResponse.setScheduleCount(schedules.size());
            errorResponse.setDiaryCount(diaries.size());
            errorResponse.setDateRange(startDate + " ~ " + endDate);
            return errorResponse;
        }

        log.info("大模型 analyze response (len={})", content.length());

        AiDTO.AnalyzeResponse response = new AiDTO.AnalyzeResponse();
        response.setMarkdown(content);
        response.setScheduleCount(schedules.size());
        response.setDiaryCount(diaries.size());
        response.setDateRange(startDate + " ~ " + endDate);
        return response;
    }

}
