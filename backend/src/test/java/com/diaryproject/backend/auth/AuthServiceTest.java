package com.diaryproject.backend.auth;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.auth.service.AuthService;
import com.diaryproject.backend.common.exception.ConflictException;
import com.diaryproject.backend.common.security.JwtUtil;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService exception handling.
 * No Spring context — pure Mockito mocks.
 */
class AuthServiceTest {

    @Test
    void register_throwsConflictException_whenUsernameExists() {
        UserRepository mockRepo = mock(UserRepository.class);
        PasswordEncoder mockEncoder = mock(PasswordEncoder.class);
        JwtUtil mockJwt = mock(JwtUtil.class);
        AuthenticationManager mockAuthManager = mock(AuthenticationManager.class);
        UserSettingsRepository mockSettingsRepo = mock(UserSettingsRepository.class);

        when(mockRepo.existsByUsername("existing")).thenReturn(true);

        AuthService service = new AuthService(mockRepo, mockEncoder, mockJwt, mockAuthManager, mockSettingsRepo);

        AuthDTO.RegisterRequest request = new AuthDTO.RegisterRequest();
        request.setUsername("existing");
        request.setPassword("password123");
        request.setNickname("Existing User");

        assertThrows(ConflictException.class, () -> service.register(request));
    }
}
