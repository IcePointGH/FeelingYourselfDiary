package com.diaryproject.backend.ai.controller;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.service.AiService;
import com.diaryproject.backend.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

/**
 * AI 分析控制器
 * Phase 0: 基础验证端点（健康检查 + 测试 Prompt）
 * Phase 2: 时间范围情绪分析
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    /** Phase 0: 健康检查 — 验证 Spring AI + MiniMax 自动配置状态 */
    @GetMapping("/health")
    public ApiResponse<AiDTO.HealthResponse> health() {
        return ApiResponse.success(aiService.health());
    }

    /** Phase 0: 基础 Prompt 测试 — 验证中文 LLM 输出 */
    @PostMapping("/test-prompt")
    public ApiResponse<AiDTO.TestPromptResponse> testPrompt(@RequestBody AiDTO.TestPromptRequest request) {
        return ApiResponse.success(aiService.testPrompt(request.getPrompt()));
    }

    /** Phase 0: Token 消耗估算 — 模拟日程+日记数据 */
    @PostMapping("/estimate-tokens")
    public ApiResponse<AiDTO.TestPromptResponse> estimateTokens(@RequestBody AiDTO.TestPromptRequest request) {
        return ApiResponse.success(aiService.estimateTokens(request.getPrompt()));
    }

    /** Phase 2: 时间范围情绪分析 — 获取指定日期范围内的日程与日记数据，调用 AI 分析 */
    @PostMapping("/analyze")
    public ApiResponse<AiDTO.AnalyzeResponse> analyze(
            @Valid @RequestBody AiDTO.AnalyzeRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST AI 分析请求 — 日期范围: {} ~ {}", request.getStartDate(), request.getEndDate());
        return ApiResponse.success(aiService.analyzeTimeRange(userId, request.getStartDate(), request.getEndDate()));
    }
}
