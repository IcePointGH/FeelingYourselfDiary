package com.diaryproject.backend.auth;

import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.ai.repository.UserMemoryRepository;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.oauth.repository.OAuthIdentityRepository;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.auth.service.AccountDeletionService;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccountDeletionServiceTest {

    @Test
    void deleteAccount_deletesOwnedDataBeforeDeletingUser() {
        UserRepository userRepository = mock(UserRepository.class);
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        DiaryRepository diaryRepository = mock(DiaryRepository.class);
        UserSettingsRepository userSettingsRepository = mock(UserSettingsRepository.class);
        AiSessionRepository aiSessionRepository = mock(AiSessionRepository.class);
        AiMessageRepository aiMessageRepository = mock(AiMessageRepository.class);
        AiSessionScheduleRepository aiSessionScheduleRepository = mock(AiSessionScheduleRepository.class);
        UserMemoryRepository userMemoryRepository = mock(UserMemoryRepository.class);
        OAuthIdentityRepository oAuthIdentityRepository = mock(OAuthIdentityRepository.class);

        User user = new User();
        user.setId(7L);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        AccountDeletionService service = new AccountDeletionService(
                userRepository,
                scheduleRepository,
                diaryRepository,
                userSettingsRepository,
                aiSessionRepository,
                aiMessageRepository,
                aiSessionScheduleRepository,
                userMemoryRepository,
                oAuthIdentityRepository
        );

        service.deleteAccount(7L);

        var ordered = inOrder(
                aiSessionScheduleRepository,
                aiMessageRepository,
                aiSessionRepository,
                userMemoryRepository,
                oAuthIdentityRepository,
                userSettingsRepository,
                scheduleRepository,
                diaryRepository,
                userRepository
        );
        ordered.verify(aiSessionScheduleRepository).deleteByUserId(7L);
        ordered.verify(aiMessageRepository).deleteByUserId(7L);
        ordered.verify(aiSessionRepository).deleteByUserId(7L);
        ordered.verify(userMemoryRepository).deleteByUserId(7L);
        ordered.verify(oAuthIdentityRepository).deleteByUserId(7L);
        ordered.verify(userSettingsRepository).deleteByUserId(7L);
        ordered.verify(scheduleRepository).deleteByUserId(7L);
        ordered.verify(diaryRepository).deleteByUserId(7L);
        ordered.verify(userRepository).delete(user);
    }

    @Test
    void deleteAccount_throwsResourceNotFound_whenUserMissing() {
        AccountDeletionService service = new AccountDeletionService(
                mock(UserRepository.class),
                mock(ScheduleRepository.class),
                mock(DiaryRepository.class),
                mock(UserSettingsRepository.class),
                mock(AiSessionRepository.class),
                mock(AiMessageRepository.class),
                mock(AiSessionScheduleRepository.class),
                mock(UserMemoryRepository.class),
                mock(OAuthIdentityRepository.class)
        );

        assertThrows(ResourceNotFoundException.class, () -> service.deleteAccount(7L));
    }

    @Test
    void deleteAccount_hasTransactionalAnnotation() throws Exception {
        Method method = AccountDeletionService.class.getMethod("deleteAccount", Long.class);
        assertNotNull(method.getAnnotation(Transactional.class));
    }
}
