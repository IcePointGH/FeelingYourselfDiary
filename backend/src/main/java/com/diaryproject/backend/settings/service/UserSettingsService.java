package com.diaryproject.backend.settings.service;

import com.diaryproject.backend.common.cache.CacheKeys;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.settings.dto.UserSettingsDTO;
import com.diaryproject.backend.settings.entity.UserSettings;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * 用户设置服务，处理用户配置的查询和更新
 */
@Service
public class UserSettingsService {

    private static final Logger log = LoggerFactory.getLogger(UserSettingsService.class);

    private final UserSettingsRepository userSettingsRepository;
    private final CacheService cacheService;

    public UserSettingsService(UserSettingsRepository userSettingsRepository, CacheService cacheService) {
        this.userSettingsRepository = userSettingsRepository;
        this.cacheService = cacheService;
    }

    /** 获取用户设置，不存在则创建默认设置 */
    @Cacheable(value = "settings", key = "#userId")
    @Transactional(readOnly = true)
    public UserSettingsDTO.Response getSettings(Long userId) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));
        return mapToResponse(settings);
    }

    /** 更新用户设置，只更新非空字段，不存在则创建 */
    @CacheEvict(value = "settings", key = "#userId")
    @Transactional(rollbackFor = Exception.class)
    public UserSettingsDTO.Response updateSettings(Long userId, UserSettingsDTO.UpdateRequest request) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));

        if (request.getEmotionLabels() != null) {
            settings.setEmotionLabels(request.getEmotionLabels());
        }
        if (request.getAutoSaveThoughts() != null) {
            settings.setAutoSaveThoughts(request.getAutoSaveThoughts());
        }
        if (request.getTheme() != null) {
            settings.setTheme(request.getTheme());
        }

        UserSettings updated = userSettingsRepository.save(settings);
        log.info("用户 {} 更新设置", userId);
        return mapToResponse(updated);
    }

    /** 导出用户设置数据 */
    public Map<String, Object> exportData(Long userId) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));
        Map<String, Object> result = new HashMap<>();
        result.put("theme", settings.getTheme());
        result.put("emotionLabels", settings.getEmotionLabels());
        result.put("autoSaveThoughts", settings.getAutoSaveThoughts());
        result.put("exportTime", Instant.now().toString());
        return result;
    }

    /** 清空用户设置数据 */
    @CacheEvict(value = "settings", key = "#userId")
    @Transactional(rollbackFor = Exception.class)
    public void clearData(Long userId) {
        userSettingsRepository.findByUserId(userId).ifPresent(userSettingsRepository::delete);
        log.warn("用户 {} 请求清除所有数据", userId);
    }

    @Transactional(rollbackFor = Exception.class)
    private UserSettings createDefaultSettings(Long userId) {
        UserSettings settings = new UserSettings();
        settings.setUserId(userId);
        settings.setTheme("morandi");
        settings.setAutoSaveThoughts(false);
        return userSettingsRepository.save(settings);
    }

    private UserSettingsDTO.Response mapToResponse(UserSettings settings) {
        UserSettingsDTO.Response response = new UserSettingsDTO.Response();
        response.setId(settings.getId());
        response.setUserId(settings.getUserId());
        response.setEmotionLabels(settings.getEmotionLabels());
        response.setAutoSaveThoughts(settings.getAutoSaveThoughts());
        response.setTheme(settings.getTheme());
        return response;
    }
}
