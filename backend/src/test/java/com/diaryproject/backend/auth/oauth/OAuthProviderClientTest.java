package com.diaryproject.backend.auth.oauth;

import com.diaryproject.backend.auth.oauth.config.OAuthProperties;
import com.diaryproject.backend.auth.oauth.service.OAuthProvider;
import com.diaryproject.backend.auth.oauth.service.QqOAuthProviderClient;
import com.diaryproject.backend.auth.oauth.service.WeChatOAuthProviderClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;

class OAuthProviderClientTest {

    @Test
    void qqClient_buildAuthorizationUri_containsRequiredParameters() {
        OAuthProperties properties = properties();
        QqOAuthProviderClient client = new QqOAuthProviderClient(properties, RestClient.builder(), new ObjectMapper());

        String uri = client.buildAuthorizationUri("state-1", "/schedule");

        assertEquals(OAuthProvider.QQ, client.getProvider());
        assertTrue(uri.startsWith("https://graph.qq.com/oauth2.0/authorize?"));
        assertTrue(uri.contains("response_type=code"));
        assertTrue(uri.contains("client_id=qq-app"));
        assertTrue(uri.contains("redirect_uri=https://www.sevensense.art/api/auth/oauth/qq/callback"));
        assertTrue(uri.contains("state=state-1"));
    }

    @Test
    void weChatClient_buildAuthorizationUri_containsRequiredParametersAndFragment() {
        OAuthProperties properties = properties();
        WeChatOAuthProviderClient client = new WeChatOAuthProviderClient(properties, RestClient.builder(), new ObjectMapper());

        String uri = client.buildAuthorizationUri("state-2", "/analysis");

        assertEquals(OAuthProvider.WECHAT, client.getProvider());
        assertTrue(uri.startsWith("https://open.weixin.qq.com/connect/qrconnect?"));
        assertTrue(uri.contains("appid=wechat-app"));
        assertTrue(uri.contains("response_type=code"));
        assertTrue(uri.contains("scope=snsapi_login"));
        assertTrue(uri.contains("state=state-2"));
        assertTrue(uri.endsWith("#wechat_redirect"));
    }

    @Test
    void qqClient_buildAuthorizationUri_usesLocalCallbackWhenMockEnabled() {
        OAuthProperties properties = properties();
        properties.getMock().setEnabled(true);
        QqOAuthProviderClient client = new QqOAuthProviderClient(properties, RestClient.builder(), new ObjectMapper());

        String uri = client.buildAuthorizationUri("state-local", "/schedule");

        assertEquals("https://www.sevensense.art/api/auth/oauth/qq/callback?code=local-mock-qq&state=state-local", uri);
    }

    private static OAuthProperties properties() {
        OAuthProperties properties = new OAuthProperties();
        properties.getQq().setClientId("qq-app");
        properties.getQq().setClientSecret("qq-secret");
        properties.getQq().setRedirectUri("https://www.sevensense.art/api/auth/oauth/qq/callback");
        properties.getWechat().setClientId("wechat-app");
        properties.getWechat().setClientSecret("wechat-secret");
        properties.getWechat().setRedirectUri("https://www.sevensense.art/api/auth/oauth/wechat/callback");
        return properties;
    }
}
