package com.diaryproject.backend.auth.oauth;

import com.diaryproject.backend.auth.oauth.config.OAuthProperties;
import com.diaryproject.backend.auth.oauth.service.GitHubOAuthProviderClient;
import com.diaryproject.backend.auth.oauth.service.OAuthProviderClient;
import com.diaryproject.backend.common.config.JacksonConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;

class OAuthProviderContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(TestRestClientConfig.class, JacksonConfig.class)
            .withBean(OAuthProperties.class)
            .withBean(GitHubOAuthProviderClient.class);

    @Test
    void githubProviderClient_canBeCreatedBySpringContext() {
        contextRunner.run(context -> {
            assertNull(context.getStartupFailure());
            assertNotNull(context.getBean(OAuthProviderClient.class));
        });
    }

    @Configuration
    static class TestRestClientConfig {
        @Bean
        RestClient.Builder restClientBuilder() {
            return RestClient.builder();
        }
    }
}
