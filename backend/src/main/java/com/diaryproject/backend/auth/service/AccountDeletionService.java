package com.diaryproject.backend.auth.service;

import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.ai.repository.UserMemoryRepository;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.oauth.repository.OAuthIdentityRepository;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final ScheduleRepository scheduleRepository;
    private final DiaryRepository diaryRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final AiSessionScheduleRepository aiSessionScheduleRepository;
    private final UserMemoryRepository userMemoryRepository;
    private final OAuthIdentityRepository oAuthIdentityRepository;

    public AccountDeletionService(UserRepository userRepository,
                                  ScheduleRepository scheduleRepository,
                                  DiaryRepository diaryRepository,
                                  UserSettingsRepository userSettingsRepository,
                                  AiSessionRepository aiSessionRepository,
                                  AiMessageRepository aiMessageRepository,
                                  AiSessionScheduleRepository aiSessionScheduleRepository,
                                  UserMemoryRepository userMemoryRepository,
                                  OAuthIdentityRepository oAuthIdentityRepository) {
        this.userRepository = userRepository;
        this.scheduleRepository = scheduleRepository;
        this.diaryRepository = diaryRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.aiSessionScheduleRepository = aiSessionScheduleRepository;
        this.userMemoryRepository = userMemoryRepository;
        this.oAuthIdentityRepository = oAuthIdentityRepository;
    }

    @CacheEvict(value = "user", key = "#userId")
    @Transactional
    public void deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));

        aiSessionScheduleRepository.deleteByUserId(userId);
        aiMessageRepository.deleteByUserId(userId);
        aiSessionRepository.deleteByUserId(userId);
        userMemoryRepository.deleteByUserId(userId);
        oAuthIdentityRepository.deleteByUserId(userId);
        userSettingsRepository.deleteByUserId(userId);
        scheduleRepository.deleteByUserId(userId);
        diaryRepository.deleteByUserId(userId);
        userRepository.delete(user);
    }
}
