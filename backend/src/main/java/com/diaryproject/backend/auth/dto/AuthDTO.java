package com.diaryproject.backend.auth.dto;

import lombok.Data;

public class AuthDTO {

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class RegisterRequest {
        private String username;
        private String password;
        private String nickname;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private UserInfo user;
    }

    @Data
    public static class UserInfo {
        private Long id;
        private String username;
        private String nickname;
        private String avatar;
        private String signature;
        private String theme;
    }
}
