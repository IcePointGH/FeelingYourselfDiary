package com.diaryproject.backend.auth.oauth.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "oauth")
@Data
public class OAuthProperties {

    private Provider github = new Provider();
    private Mock mock = new Mock();

    @Data
    public static class Provider {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
    }

    @Data
    public static class Mock {
        private boolean enabled = false;
    }
}
