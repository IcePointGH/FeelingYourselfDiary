package com.diaryproject.backend.auth.service;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.common.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 认证服务，处理用户登录、注册、信息获取等认证相关业务
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    /**
     * 用户登录认证
     * @param request 包含用户名和密码的登录请求
     * @return 认证响应，包含 JWT token 和用户信息
     */
    public AuthDTO.AuthResponse login(AuthDTO.LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());

        AuthDTO.AuthResponse response = new AuthDTO.AuthResponse();
        response.setToken(token);
        response.setUser(mapToUserInfo(user));
        return response;
    }

    /**
     * 用户注册，创建新账户并返回认证信息
     * @param request 包含用户名、密码和昵称的注册请求
     * @return 认证响应，包含 JWT token 和用户信息
     * @throws RuntimeException 如果用户名已存在
     */
    public AuthDTO.AuthResponse register(AuthDTO.RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setTheme("morandi");

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());

        AuthDTO.AuthResponse response = new AuthDTO.AuthResponse();
        response.setToken(token);
        response.setUser(mapToUserInfo(user));
        return response;
    }

    /**
     * 获取指定用户的公开信息
     * @param userId 用户 ID
     * @return 用户公开信息（不包含敏感字段）
     */
    public AuthDTO.UserInfo getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return mapToUserInfo(user);
    }

    /**
     * 更新用户头像
     * @param userId 用户 ID
     * @param avatarUrl 头像 URL
     */
    @Transactional
    public void updateAvatar(Long userId, String avatarUrl) {
        log.info("正在更新用户头像，userId: {}, avatarUrl: {}", userId, avatarUrl);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setAvatar(avatarUrl);
        userRepository.save(user);
        log.info("用户头像更新成功，userId: {}", userId);
    }

    private AuthDTO.UserInfo mapToUserInfo(User user) {
        AuthDTO.UserInfo info = new AuthDTO.UserInfo();
        info.setId(user.getId());
        info.setUsername(user.getUsername());
        info.setNickname(user.getNickname());
        info.setAvatar(user.getAvatar());
        info.setSignature(user.getSignature());
        info.setTheme(user.getTheme());
        return info;
    }
}
