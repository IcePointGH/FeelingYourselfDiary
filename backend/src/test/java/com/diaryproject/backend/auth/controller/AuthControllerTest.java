package com.diaryproject.backend.auth.controller;

import com.diaryproject.backend.auth.service.AuthService;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.common.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthController logout endpoint.
 * Pure Mockito — no Spring context.
 */
class AuthControllerTest {

    @Test
    void logout_blacklistsToken_whenValidToken() {
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        JwtUtil mockJwtUtil = mock(JwtUtil.class);
        AuthService mockAuthService = mock(AuthService.class);
        CacheService mockCacheService = mock(CacheService.class);

        when(mockRequest.getHeader("Authorization")).thenReturn("Bearer valid-token");
        when(mockJwtUtil.validateToken("valid-token")).thenReturn(true);
        when(mockJwtUtil.extractTokenId("valid-token")).thenReturn("test-jti");
        when(mockJwtUtil.getExpirationFromToken("valid-token"))
                .thenReturn(new Date(System.currentTimeMillis() + 3600000));

        AuthController controller = new AuthController(mockAuthService, mockJwtUtil, mockCacheService);
        ApiResponse<Void> response = controller.logout(mockRequest);

        verify(mockCacheService).blacklistToken(eq("test-jti"), any());
        assertNotNull(response);
        assertEquals(200, response.getCode());
        assertNull(response.getData());
    }

    @Test
    void logout_doesNothing_whenNoAuthorizationHeader() {
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        JwtUtil mockJwtUtil = mock(JwtUtil.class);
        AuthService mockAuthService = mock(AuthService.class);
        CacheService mockCacheService = mock(CacheService.class);

        when(mockRequest.getHeader("Authorization")).thenReturn(null);

        AuthController controller = new AuthController(mockAuthService, mockJwtUtil, mockCacheService);
        controller.logout(mockRequest);

        verify(mockCacheService, never()).blacklistToken(any(), any());
        verify(mockJwtUtil, never()).validateToken(any());
    }

    @Test
    void logout_doesNothing_whenTokenInvalid() {
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        JwtUtil mockJwtUtil = mock(JwtUtil.class);
        AuthService mockAuthService = mock(AuthService.class);
        CacheService mockCacheService = mock(CacheService.class);

        when(mockRequest.getHeader("Authorization")).thenReturn("Bearer bad-token");
        when(mockJwtUtil.validateToken("bad-token")).thenReturn(false);

        AuthController controller = new AuthController(mockAuthService, mockJwtUtil, mockCacheService);
        controller.logout(mockRequest);

        verify(mockCacheService, never()).blacklistToken(any(), any());
    }
}
