package com.diaryproject.backend.auth;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.auth.service.AuthService;
import com.diaryproject.backend.common.exception.ConflictException;
import com.diaryproject.backend.common.security.JwtUtil;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Method;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService. Covers login, register exception handling,
 * and cache annotation presence.
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

    @Test
    void login_returnsAuthResponseWithNonEmptyToken() {
        UserRepository mockRepo = mock(UserRepository.class);
        PasswordEncoder mockEncoder = mock(PasswordEncoder.class);
        JwtUtil mockJwt = mock(JwtUtil.class);
        AuthenticationManager mockAuthManager = mock(AuthenticationManager.class);
        UserSettingsRepository mockSettingsRepo = mock(UserSettingsRepository.class);

        Authentication auth = mock(Authentication.class);
        when(mockAuthManager.authenticate(any())).thenReturn(auth);

        User user = new User();
        user.setId(1L);
        user.setUsername("test");
        when(mockRepo.findByUsername("test")).thenReturn(Optional.of(user));

        when(mockJwt.generateToken(1L, "test")).thenReturn("mock-token");

        when(mockSettingsRepo.findByUserId(1L)).thenReturn(Optional.empty());

        AuthService service = new AuthService(mockRepo, mockEncoder, mockJwt, mockAuthManager, mockSettingsRepo);

        AuthDTO.LoginRequest request = new AuthDTO.LoginRequest();
        request.setUsername("test");
        request.setPassword("password123");

        AuthDTO.AuthResponse response = service.login(request);

        assertNotNull(response.getToken());
        assertEquals("mock-token", response.getToken());
    }

    @Test
    void login_callsJwtUtilGenerateToken_withCorrectUserIdAndUsername() {
        UserRepository mockRepo = mock(UserRepository.class);
        PasswordEncoder mockEncoder = mock(PasswordEncoder.class);
        JwtUtil mockJwt = mock(JwtUtil.class);
        AuthenticationManager mockAuthManager = mock(AuthenticationManager.class);
        UserSettingsRepository mockSettingsRepo = mock(UserSettingsRepository.class);

        Authentication auth = mock(Authentication.class);
        when(mockAuthManager.authenticate(any())).thenReturn(auth);

        User user = new User();
        user.setId(1L);
        user.setUsername("test");
        when(mockRepo.findByUsername("test")).thenReturn(Optional.of(user));

        when(mockJwt.generateToken(1L, "test")).thenReturn("mock-token");

        when(mockSettingsRepo.findByUserId(1L)).thenReturn(Optional.empty());

        AuthService service = new AuthService(mockRepo, mockEncoder, mockJwt, mockAuthManager, mockSettingsRepo);

        AuthDTO.LoginRequest request = new AuthDTO.LoginRequest();
        request.setUsername("test");
        request.setPassword("password123");

        service.login(request);

        verify(mockJwt, times(1)).generateToken(1L, "test");
    }

    @Test
    void updateAvatar_hasCacheEvictAnnotation() throws Exception {
        Method m = AuthService.class.getMethod("updateAvatar", Long.class, String.class);
        CacheEvict ce = m.getAnnotation(CacheEvict.class);
        assertNotNull(ce);
    }

    @Test
    void getUserInfo_hasCacheableAnnotation() throws Exception {
        Method m = AuthService.class.getMethod("getUserInfo", Long.class);
        Cacheable ca = m.getAnnotation(Cacheable.class);
        assertNotNull(ca);
    }
}
