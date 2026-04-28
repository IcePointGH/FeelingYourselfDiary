package com.diaryproject.backend.settings.controller;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.settings.dto.UserSettingsDTO;
import com.diaryproject.backend.settings.service.UserSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class UserSettingsController {

    private static final Logger log = LoggerFactory.getLogger(UserSettingsController.class);

    private final UserSettingsService userSettingsService;

    public UserSettingsController(UserSettingsService userSettingsService) {
        this.userSettingsService = userSettingsService;
    }

    @GetMapping
    public ApiResponse<UserSettingsDTO.Response> getSettings(HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(userSettingsService.getSettings(userId));
    }

    @PutMapping
    public ApiResponse<UserSettingsDTO.Response> updateSettings(
            @Valid @RequestBody UserSettingsDTO.UpdateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        log.info("REST 更新设置请求");
        return ApiResponse.success(userSettingsService.updateSettings(userId, request));
    }

    @GetMapping("/export")
    public ApiResponse<Map<String, Object>> exportData(HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        return ApiResponse.success(userSettingsService.exportData(userId));
    }

    @DeleteMapping("/clear")
    public ApiResponse<Void> clearData(HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        userSettingsService.clearData(userId);
        return ApiResponse.success(null);
    }
}
