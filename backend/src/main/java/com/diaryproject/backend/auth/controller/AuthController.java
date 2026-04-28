package com.diaryproject.backend.auth.controller;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.common.security.JwtUtil;
import com.diaryproject.backend.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ApiResponse<AuthDTO.AuthResponse> login(@Valid @RequestBody AuthDTO.LoginRequest request) {
        log.info("REST 登录请求");
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/register")
    public ApiResponse<AuthDTO.AuthResponse> register(@Valid @RequestBody AuthDTO.RegisterRequest request) {
        log.info("REST 注册请求");
        return ApiResponse.success(authService.register(request));
    }

    @GetMapping("/me")
    public ApiResponse<AuthDTO.UserInfo> getCurrentUser(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return ApiResponse.success(authService.getUserInfo(userId));
    }
}
