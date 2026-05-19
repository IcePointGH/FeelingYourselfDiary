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
public class WeChatOAuthProviderClient implements OAuthProviderClient {

    private static final String AUTHORIZE_URL = "https://open.weixin.qq.com/connect/qrconnect";
    private static final String TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token";
    private static final String USER_INFO_URL = "https://api.weixin.qq.com/sns/userinfo";

    private final OAuthProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public WeChatOAuthProviderClient(OAuthProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public OAuthProvider getProvider() {
        return OAuthProvider.WECHAT;
    }

    @Override
    public String buildAuthorizationUri(String state, String returnTo) {
        OAuthProperties.Provider wechat = properties.getWechat();
        if (properties.getMock().isEnabled()) {
            return UriComponentsBuilder.fromUriString(wechat.getRedirectUri())
                    .queryParam("code", "local-mock-wechat")
                    .queryParam("state", state)
                    .build()
                    .encode()
                    .toUriString();
        }
        ensureConfigured(wechat);
        return UriComponentsBuilder.fromUriString(AUTHORIZE_URL)
                .queryParam("appid", wechat.getClientId())
                .queryParam("redirect_uri", wechat.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", "snsapi_login")
                .queryParam("state", state)
                .fragment("wechat_redirect")
                .build()
                .encode()
                .toUriString();
    }

    @Override
    public OAuthDTO.ProviderProfile fetchUserProfile(String code) {
        if (properties.getMock().isEnabled()) {
            return new OAuthDTO.ProviderProfile(
                    "local-mock-wechat-openid",
                    "local-mock-wechat-unionid",
                    "本地微信测试用户",
                    "/default-avatar.svg"
            );
        }
        OAuthProperties.Provider wechat = properties.getWechat();
        ensureConfigured(wechat);
        String tokenBody = restClient.get()
                .uri(UriComponentsBuilder.fromUriString(TOKEN_URL)
                        .queryParam("appid", wechat.getClientId())
                        .queryParam("secret", wechat.getClientSecret())
                        .queryParam("code", code)
                        .queryParam("grant_type", "authorization_code")
                        .build()
                        .encode()
                        .toUri())
                .retrieve()
                .body(String.class);
        Map<String, Object> token = parseJson(tokenBody);
        String accessToken = stringValue(token, "access_token");
        String openid = stringValue(token, "openid");
        String unionid = stringValue(token, "unionid");
        if (isBlank(accessToken) || isBlank(openid)) {
            throw new BadRequestException("WeChat authorization failed");
        }

        String userInfoBody = restClient.get()
                .uri(UriComponentsBuilder.fromUriString(USER_INFO_URL)
                        .queryParam("access_token", accessToken)
                        .queryParam("openid", openid)
                        .build()
                        .encode()
                        .toUri())
                .retrieve()
                .body(String.class);
        Map<String, Object> userInfo = parseJson(userInfoBody);
        String nickname = stringValue(userInfo, "nickname");
        String avatar = stringValue(userInfo, "headimgurl");
        String profileUnionid = stringValue(userInfo, "unionid");
        return new OAuthDTO.ProviderProfile(openid, firstNonBlank(profileUnionid, unionid), nickname, avatar);
    }

    private void ensureConfigured(OAuthProperties.Provider provider) {
        if (isBlank(provider.getClientId()) || isBlank(provider.getClientSecret()) || isBlank(provider.getRedirectUri())) {
            throw new BadRequestException("WeChat OAuth is not configured");
        }
    }

    private Map<String, Object> parseJson(String body) {
        try {
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new BadRequestException("WeChat response is invalid");
        }
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
