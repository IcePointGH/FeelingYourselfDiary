package com.diaryproject.backend.auth.oauth.service;

import com.diaryproject.backend.auth.oauth.config.OAuthProperties;
import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Component
public class GitHubOAuthProviderClient implements OAuthProviderClient {

    private static final String AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
    private static final String TOKEN_URL = "https://github.com/login/oauth/access_token";
    private static final String USER_URL = "https://api.github.com/user";

    private final OAuthProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GitHubOAuthProviderClient(OAuthProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public OAuthProvider getProvider() {
        return OAuthProvider.GITHUB;
    }

    @Override
    public String buildAuthorizationUri(String state, String returnTo) {
        OAuthProperties.Provider github = properties.getGithub();
        if (properties.getMock().isEnabled()) {
            return UriComponentsBuilder.fromUriString(github.getRedirectUri())
                    .queryParam("code", "local-mock-github")
                    .queryParam("state", state)
                    .build()
                    .encode()
                    .toUriString();
        }
        ensureConfigured(github);
        return UriComponentsBuilder.fromUriString(AUTHORIZE_URL)
                .queryParam("client_id", github.getClientId())
                .queryParam("redirect_uri", github.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", "read:user")
                .queryParam("state", state)
                .build()
                .encode()
                .toUriString();
    }

    @Override
    public OAuthDTO.ProviderProfile fetchUserProfile(String code) {
        if (properties.getMock().isEnabled()) {
            return new OAuthDTO.ProviderProfile(
                    "local-mock-github-id",
                    null,
                    "本地 GitHub 测试用户",
                    "/default-avatar.svg"
            );
        }
        OAuthProperties.Provider github = properties.getGithub();
        ensureConfigured(github);
        MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
        tokenRequest.add("client_id", github.getClientId());
        tokenRequest.add("client_secret", github.getClientSecret());
        tokenRequest.add("code", code);
        tokenRequest.add("redirect_uri", github.getRedirectUri());
        String tokenBody = restClient.post()
                .uri(TOKEN_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(tokenRequest)
                .retrieve()
                .body(String.class);
        Map<String, Object> token = parseJson(tokenBody);
        String accessToken = stringValue(token, "access_token");
        if (isBlank(accessToken)) {
            throw new BadRequestException("GitHub authorization failed");
        }

        String userBody = restClient.get()
                .uri(USER_URL)
                .accept(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken)
                .header("X-GitHub-Api-Version", "2022-11-28")
                .retrieve()
                .body(String.class);
        Map<String, Object> user = parseJson(userBody);
        String id = stringValue(user, "id");
        String nickname = firstNonBlank(stringValue(user, "name"), stringValue(user, "login"));
        String avatar = stringValue(user, "avatar_url");
        if (isBlank(id)) {
            throw new BadRequestException("GitHub identity lookup failed");
        }
        return new OAuthDTO.ProviderProfile(id, null, nickname, avatar);
    }

    private void ensureConfigured(OAuthProperties.Provider provider) {
        if (isBlank(provider.getClientId()) || isBlank(provider.getClientSecret()) || isBlank(provider.getRedirectUri())) {
            throw new BadRequestException("GitHub OAuth is not configured");
        }
    }

    private Map<String, Object> parseJson(String body) {
        try {
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new BadRequestException("GitHub response is invalid");
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
