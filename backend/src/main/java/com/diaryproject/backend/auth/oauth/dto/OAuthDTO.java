package com.diaryproject.backend.auth.oauth.dto;

import com.diaryproject.backend.auth.dto.AuthDTO;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class OAuthDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderProfile {
        private String openid;
        private String unionid;
        private String nickname;
        private String avatar;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OAuthState {
        private String provider;
        private String returnTo;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OAuthTicket {
        private AuthDTO.AuthResponse authResponse;
        private String returnTo;
    }

    @Data
    public static class CompleteRequest {
        @NotBlank
        private String ticket;
    }
}
