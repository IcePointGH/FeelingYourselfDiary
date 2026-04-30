package com.diaryproject.backend.auth.service;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.common.security.JwtUtil;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.settings.entity.UserSettings;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import com.diaryproject.backend.common.exception.ConflictException;
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
    private final UserSettingsRepository userSettingsRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager,
                       UserSettingsRepository userSettingsRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.userSettingsRepository = userSettingsRepository;
    }

    /**
     * 用户登录认证
     * @param request 包含用户名和密码的登录请求
     * @return 认证响应，包含 JWT token 和用户信息
     */
    public AuthDTO.AuthResponse login(AuthDTO.LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (Exception e) {
            log.warn("用户 {} 登录失败", request.getUsername());
            throw e;
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());

        log.info("用户 {} 登录成功", request.getUsername());

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
    @Transactional(rollbackFor = Exception.class)
    public AuthDTO.AuthResponse register(AuthDTO.RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("注册失败，请检查输入信息");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());

        userRepository.save(user);
        log.info("新用户注册: {}", request.getUsername());

        // Create default user settings (includes theme)
        UserSettings settings = new UserSettings();
        settings.setUserId(user.getId());
        settings.setTheme("morandi");
        settings.setAutoSaveThoughts(false);
        userSettingsRepository.save(settings);

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
    @Cacheable(value = "user", key = "#userId")
    @Transactional(readOnly = true)
    public AuthDTO.UserInfo getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        return mapToUserInfo(user);
    }

    /**
     * 更新用户头像
     * @param userId 用户 ID
     * @param avatarUrl 头像 URL
     */
    @CacheEvict(value = "user", key = "#userId")
    @Transactional
    public void updateAvatar(Long userId, String avatarUrl) {
        log.info("正在更新用户头像，userId: {}, avatarUrl: {}", userId, avatarUrl);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
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
        // Fetch theme from UserSettings instead of User entity
        String theme = userSettingsRepository.findByUserId(user.getId())
                .map(UserSettings::getTheme)
                .orElse("morandi");
        info.setTheme(theme);
        return info;
    }
}
