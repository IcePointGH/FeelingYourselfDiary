package com.diaryproject.backend.ai.controller;

import com.diaryproject.backend.ai.entity.UserMemory;
import com.diaryproject.backend.ai.service.MemoryService;
import com.diaryproject.backend.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

/**
 * 用户记忆画像控制器 — 调试与管理接口。
 * <p>
 * 提供 GET/DELETE 端点用于查看和清除用户的对话记忆画像。
 * 画像的自动更新由 {@link MemoryService#updateMemory(Long)} 在每 N 轮对话后异步触发。
 * </p>
 */
@RestController
@RequestMapping("/api/ai")
public class AiMemoryController {

    private static final Logger log = LoggerFactory.getLogger(AiMemoryController.class);

    private final MemoryService memoryService;

    public AiMemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    /**
     * 获取当前用户的记忆画像（调试用）。
     */
    @GetMapping("/memory")
    public ApiResponse<UserMemory> getMemory(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("REST 查询用户记忆 — userId: {}", userId);
        return ApiResponse.success(memoryService.getOrCreate(userId));
    }

    /**
     * 清除当前用户的记忆画像。
     */
    @DeleteMapping("/memory")
    public ApiResponse<Void> clearMemory(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("REST 清除用户记忆 — userId: {}", userId);
        memoryService.clear(userId);
        return ApiResponse.success();
    }
}
