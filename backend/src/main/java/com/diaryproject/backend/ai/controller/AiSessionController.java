package com.diaryproject.backend.ai.controller;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.service.AiAnalysisService;
import com.diaryproject.backend.ai.service.AiChatService;
import com.diaryproject.backend.ai.service.AiSessionService;
import com.diaryproject.backend.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/**
 * AI 会话控制器 — 管理 AI 对话会话（CRUD）
 */
@RestController
@RequestMapping("/api/ai/sessions")
public class AiSessionController {

    private static final Logger log = LoggerFactory.getLogger(AiSessionController.class);

    private final AiSessionService aiSessionService;
    private final AiChatService aiChatService;
    private final AiAnalysisService aiAnalysisService;

    public AiSessionController(AiSessionService aiSessionService,
                               AiChatService aiChatService,
                               AiAnalysisService aiAnalysisService) {
        this.aiSessionService = aiSessionService;
        this.aiChatService = aiChatService;
        this.aiAnalysisService = aiAnalysisService;
    }

    /**
     * 创建新会话
     * <p>
     * 当 {@code sessionType} 为 {@code "full"} 时，后台异步启动全量历史分析
     * ({@link AiAnalysisService#analyzeFullHistory})，前端可通过轮询
     * {@code GET /api/ai/sessions/{id}} 查看进度和状态。
     * </p>
     */
    @PostMapping
    public ApiResponse<AiDTO.SessionResponse> createSession(
            @Valid @RequestBody AiDTO.CreateSessionRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 创建 AI 会话 — userId: {}, type: {}, title: {}", userId, request.getSessionType(), request.getTitle());

        AiDTO.SessionResponse response = aiSessionService.createSession(userId, request);

        // Mode 3: 全量历史分析 — 异步触发，前台轮询进度
        if ("full".equals(request.getSessionType())) {
            log.info("触发全量历史分析 — userId: {}, sessionId: {}", userId, response.getId());
            aiAnalysisService.analyzeFullHistory(userId, response.getId());
        }

        return ApiResponse.success(response);
    }

    /**
     * 获取当前用户的所有会话列表（支持类型筛选 + 分页）
     */
    @GetMapping
    public ApiResponse<List<AiDTO.SessionListItem>> listSessions(
            HttpServletRequest httpRequest,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 查询 AI 会话列表 — userId: {}, type: {}, page: {}, size: {}", userId, type, page, size);
        return ApiResponse.success(aiSessionService.listUserSessions(userId, type, page, size));
    }

    /**
     * 获取会话详情（含消息列表）
     */
    @GetMapping("/{sessionId}")
    public ApiResponse<AiDTO.SessionResponse> getSession(
            @PathVariable Long sessionId,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 查询 AI 会话详情 — userId: {}, sessionId: {}", userId, sessionId);
        return ApiResponse.success(aiSessionService.getSessionDetail(userId, sessionId));
    }

    /**
     * 删除会话
     */
    @DeleteMapping("/{sessionId}")
    public ApiResponse<Void> deleteSession(
            @PathVariable Long sessionId,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 删除 AI 会话 — userId: {}, sessionId: {}", userId, sessionId);
        aiSessionService.deleteSession(userId, sessionId);
        return ApiResponse.success();
    }

    /**
     * 流式聊天 — SSE 实时响应（Mode 1 聊天）
     * <p>禁用响应缓冲 {@code response.setBufferSize(0)} 确保每个 token 被立即推送，
     * 配合前端 requestAnimationFrame 限帧渲染实现丝滑流式输出。</p>
     */
    @PostMapping("/{sessionId}/chat")
    public SseEmitter chat(
            @PathVariable Long sessionId,
            @Valid @RequestBody AiDTO.ChatRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        // Disable servlet response buffering — every SseEmitter.send() pushes to socket immediately
        httpResponse.setBufferSize(0);
        log.info("REST AI 聊天 — userId: {}, sessionId: {}", userId, sessionId);
        return aiChatService.chat(userId, sessionId, request.getMessage());
    }

    /**
     * 重命名会话
     */
    @PutMapping("/{sessionId}")
    public ApiResponse<AiDTO.SessionResponse> renameSession(
            @PathVariable Long sessionId,
            @Valid @RequestBody AiDTO.RenameRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 重命名会话 — userId: {}, sessionId: {}", userId, sessionId);
        return ApiResponse.success(aiSessionService.renameSession(userId, sessionId, request.getTitle()));
    }
}
