package com.diaryproject.backend.auth.oauth;

import com.diaryproject.backend.auth.oauth.config.OAuthProperties;
import com.diaryproject.backend.auth.oauth.service.GitHubOAuthProviderClient;
import com.diaryproject.backend.auth.oauth.service.OAuthProvider;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.junit.jupiter.api.Assertions.*;

class OAuthProviderClientTest {

    @Test
    void githubClient_buildAuthorizationUri_containsRequiredParameters() {
        OAuthProperties properties = properties();
        GitHubOAuthProviderClient client = new GitHubOAuthProviderClient(properties, RestClient.builder(), new ObjectMapper());

        String uri = client.buildAuthorizationUri("state-1", "/schedule");

        assertEquals(OAuthProvider.GITHUB, client.getProvider());
        assertTrue(uri.startsWith("https://github.com/login/oauth/authorize?"));
        assertTrue(uri.contains("response_type=code"));
        assertTrue(uri.contains("client_id=github-app"));
        assertTrue(uri.contains("redirect_uri=https://www.sevensense.art/api/auth/oauth/github/callback"));
        assertTrue(uri.contains("state=state-1"));
        assertTrue(uri.contains("scope=read:user") || uri.contains("scope=read%3Auser"));
    }

    @Test
    void githubClient_buildAuthorizationUri_usesLocalCallbackWhenMockEnabled() {
        OAuthProperties properties = properties();
        properties.getMock().setEnabled(true);
        GitHubOAuthProviderClient client = new GitHubOAuthProviderClient(properties, RestClient.builder(), new ObjectMapper());

        String uri = client.buildAuthorizationUri("state-local", "/schedule");

        assertEquals("https://www.sevensense.art/api/auth/oauth/github/callback?code=local-mock-github&state=state-local", uri);
    }

    @Test
    void githubClient_fetchUserProfile_wrapsNetworkFailureAsBadRequestException() {
        OAuthProperties properties = properties();
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo("https://github.com/login/oauth/access_token"))
                .andRespond(request -> {
                    throw new ResourceAccessException("Connection timed out");
                });
        GitHubOAuthProviderClient client = new GitHubOAuthProviderClient(properties, builder, new ObjectMapper());

        BadRequestException error = assertThrows(BadRequestException.class, () -> client.fetchUserProfile("code"));

        assertTrue(error.getMessage().contains("GitHub 登录服务暂时不可用"));
        server.verify();
    }

    @Test
    void qqProvider_isNotSupported() {
        assertThrows(com.diaryproject.backend.common.exception.BadRequestException.class,
                () -> OAuthProvider.from("qq"));
    }

    @Test
    void wechatProvider_isNotSupported() {
        assertThrows(com.diaryproject.backend.common.exception.BadRequestException.class,
                () -> OAuthProvider.from("wechat"));
    }

    @Test
    void githubProvider_isSupported() {
        assertEquals(OAuthProvider.GITHUB, OAuthProvider.from("github"));
    }

    private static OAuthProperties properties() {
        OAuthProperties properties = new OAuthProperties();
        properties.getGithub().setClientId("github-app");
        properties.getGithub().setClientSecret("github-secret");
        properties.getGithub().setRedirectUri("https://www.sevensense.art/api/auth/oauth/github/callback");
        return properties;
    }
}
