package com.diaryproject.backend.common.security;

import com.diaryproject.backend.common.cache.CacheService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.io.PrintWriter;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for JwtAuthenticationFilter. Pure Mockito — no Spring context.
 */
class JwtAuthenticationFilterTest {

    @Test
    void doFilterInternal_passesRequest_whenValidTokenNotBlacklisted() throws Exception {
        JwtUtil mockJwt = mock(JwtUtil.class);
        UserDetailsService mockUserDetailsService = mock(UserDetailsService.class);
        CacheService mockCache = mock(CacheService.class);
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        HttpServletResponse mockResponse = mock(HttpServletResponse.class);
        FilterChain mockChain = mock(FilterChain.class);

        when(mockRequest.getHeader("Authorization")).thenReturn("Bearer valid-token");
        when(mockJwt.validateToken("valid-token")).thenReturn(true);
        when(mockJwt.extractTokenId("valid-token")).thenReturn("jti-123");
        when(mockCache.isTokenBlacklisted("jti-123")).thenReturn(false);
        when(mockJwt.getUserIdFromToken("valid-token")).thenReturn(1L);
        when(mockJwt.getUsernameFromToken("valid-token")).thenReturn("testuser");

        UserDetails mockUserDetails = mock(UserDetails.class);
        when(mockUserDetails.getAuthorities()).thenReturn(Collections.emptyList());
        when(mockUserDetailsService.loadUserByUsername("testuser")).thenReturn(mockUserDetails);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(mockJwt, mockUserDetailsService, mockCache);
        filter.doFilterInternal(mockRequest, mockResponse, mockChain);

        verify(mockChain).doFilter(mockRequest, mockResponse);
        verify(mockResponse, never()).setStatus(anyInt());
    }

    @Test
    void doFilterInternal_returns401_whenTokenBlacklisted() throws Exception {
        JwtUtil mockJwt = mock(JwtUtil.class);
        UserDetailsService mockUserDetailsService = mock(UserDetailsService.class);
        CacheService mockCache = mock(CacheService.class);
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        HttpServletResponse mockResponse = mock(HttpServletResponse.class);
        FilterChain mockChain = mock(FilterChain.class);
        PrintWriter mockWriter = mock(PrintWriter.class);

        when(mockRequest.getHeader("Authorization")).thenReturn("Bearer blacklisted-token");
        when(mockJwt.validateToken("blacklisted-token")).thenReturn(true);
        when(mockJwt.extractTokenId("blacklisted-token")).thenReturn("jti-blocked");
        when(mockCache.isTokenBlacklisted("jti-blocked")).thenReturn(true);
        when(mockResponse.getWriter()).thenReturn(mockWriter);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(mockJwt, mockUserDetailsService, mockCache);
        filter.doFilterInternal(mockRequest, mockResponse, mockChain);

        verify(mockResponse).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(mockResponse).setContentType("application/json;charset=UTF-8");
        verify(mockChain, never()).doFilter(any(), any());
    }

    @Test
    void doFilterInternal_returns401_whenTokenInvalid() throws Exception {
        JwtUtil mockJwt = mock(JwtUtil.class);
        UserDetailsService mockUserDetailsService = mock(UserDetailsService.class);
        CacheService mockCache = mock(CacheService.class);
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        HttpServletResponse mockResponse = mock(HttpServletResponse.class);
        FilterChain mockChain = mock(FilterChain.class);
        PrintWriter mockWriter = mock(PrintWriter.class);

        when(mockRequest.getHeader("Authorization")).thenReturn("Bearer bad-token");
        when(mockJwt.validateToken("bad-token")).thenReturn(false);
        when(mockResponse.getWriter()).thenReturn(mockWriter);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(mockJwt, mockUserDetailsService, mockCache);
        filter.doFilterInternal(mockRequest, mockResponse, mockChain);

        verify(mockResponse).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(mockChain, never()).doFilter(any(), any());
    }

    @Test
    void doFilterInternal_skipsFilter_whenNoAuthorizationHeader() throws Exception {
        JwtUtil mockJwt = mock(JwtUtil.class);
        UserDetailsService mockUserDetailsService = mock(UserDetailsService.class);
        CacheService mockCache = mock(CacheService.class);
        HttpServletRequest mockRequest = mock(HttpServletRequest.class);
        HttpServletResponse mockResponse = mock(HttpServletResponse.class);
        FilterChain mockChain = mock(FilterChain.class);

        when(mockRequest.getHeader("Authorization")).thenReturn(null);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(mockJwt, mockUserDetailsService, mockCache);
        filter.doFilterInternal(mockRequest, mockResponse, mockChain);

        verify(mockChain).doFilter(mockRequest, mockResponse);
        verify(mockJwt, never()).validateToken(anyString());
        verify(mockResponse, never()).setStatus(anyInt());
    }
}
