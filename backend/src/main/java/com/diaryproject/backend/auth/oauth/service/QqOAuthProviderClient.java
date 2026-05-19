package com.diaryproject.backend.auth.oauth.service;

import com.diaryproject.backend.auth.oauth.config.OAuthProperties;
import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Component
public class QqOAuthProviderClient implements OAuthProviderClient {

    private static final String AUTHORIZE_URL = "https://graph.qq.com/oauth2.0/authorize";
    private static final String TOKEN_URL = "https://graph.qq.com/oauth2.0/token";
    private static final String OPENID_URL = "https://graph.qq.com/oauth2.0/me";
    private static final String USER_INFO_URL = "https://graph.qq.com/user/get_user_info";

    private final OAuthProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public QqOAuthProviderClient(OAuthProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public OAuthProvider getProvider() {
        return OAuthProvider.QQ;
    }

    @Override
    public String buildAuthorizationUri(String state, String returnTo) {
        OAuthProperties.Provider qq = properties.getQq();
        if (properties.getMock().isEnabled()) {
            return UriComponentsBuilder.fromUriString(qq.getRedirectUri())
                    .queryParam("code", "local-mock-qq")
                    .queryParam("state", state)
                    .build()
                    .encode()
                    .toUriString();
        }
        ensureConfigured(qq);
        return UriComponentsBuilder.fromUriString(AUTHORIZE_URL)
                .queryParam("response_type", "code")
                .queryParam("client_id", qq.getClientId())
                .queryParam("redirect_uri", qq.getRedirectUri())
                .queryParam("state", state)
                .queryParam("scope", "get_user_info")
                .build()
                .encode()
                .toUriString();
    }

    @Override
    public OAuthDTO.ProviderProfile fetchUserProfile(String code) {
        if (properties.getMock().isEnabled()) {
            return new OAuthDTO.ProviderProfile(
                    "local-mock-qq-openid",
                    "local-mock-qq-unionid",
                    "本地 QQ 测试用户",
                    "/default-avatar.svg"
            );
        }
        OAuthProperties.Provider qq = properties.getQq();
        ensureConfigured(qq);
        String tokenBody = restClient.get()
                .uri(UriComponentsBuilder.fromUriString(TOKEN_URL)
                        .queryParam("grant_type", "authorization_code")
                        .queryParam("client_id", qq.getClientId())
                        .queryParam("client_secret", qq.getClientSecret())
                        .queryParam("code", code)
                        .queryParam("redirect_uri", qq.getRedirectUri())
                        .queryParam("fmt", "json")
                        .build()
                        .encode()
                        .toUri())
                .retrieve()
                .body(String.class);
        Map<String, Object> token = parseJson(tokenBody);
        String accessToken = stringValue(token, "access_token");
        if (accessToken == null || accessToken.isBlank()) {
            throw new BadRequestException("QQ authorization failed");
        }

        String openidBody = restClient.get()
                .uri(UriComponentsBuilder.fromUriString(OPENID_URL)
                        .queryParam("access_token", accessToken)
                        .queryParam("fmt", "json")
                        .build()
                        .encode()
                        .toUri())
                .retrieve()
                .body(String.class);
        Map<String, Object> openidPayload = parseJson(stripJsonp(openidBody));
        String openid = stringValue(openidPayload, "openid");
        String unionid = stringValue(openidPayload, "unionid");
        if (openid == null || openid.isBlank()) {
            throw new BadRequestException("QQ identity lookup failed");
        }

        String userInfoBody = restClient.get()
                .uri(UriComponentsBuilder.fromUriString(USER_INFO_URL)
                        .queryParam("access_token", accessToken)
                        .queryParam("oauth_consumer_key", qq.getClientId())
                        .queryParam("openid", openid)
                        .build()
                        .encode()
                        .toUri())
                .retrieve()
                .body(String.class);
        Map<String, Object> userInfo = parseJson(userInfoBody);
        String nickname = stringValue(userInfo, "nickname");
        String avatar = firstNonBlank(stringValue(userInfo, "figureurl_qq_2"), stringValue(userInfo, "figureurl_qq_1"));
        return new OAuthDTO.ProviderProfile(openid, unionid, nickname, avatar);
    }

    private void ensureConfigured(OAuthProperties.Provider provider) {
        if (isBlank(provider.getClientId()) || isBlank(provider.getClientSecret()) || isBlank(provider.getRedirectUri())) {
            throw new BadRequestException("QQ OAuth is not configured");
        }
    }

    private Map<String, Object> parseJson(String body) {
        try {
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new BadRequestException("QQ response is invalid");
        }
    }

    private String stripJsonp(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("callback(") && trimmed.endsWith(");")) {
            return trimmed.substring("callback(".length(), trimmed.length() - 2).trim();
        }
        return trimmed;
    }

    private String stringValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private String firstNonBlank(String first, String second) {
        return isBlank(first) ? second : first;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
