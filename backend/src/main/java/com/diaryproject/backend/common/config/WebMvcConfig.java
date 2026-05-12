package com.diaryproject.backend.common.config;

import com.diaryproject.backend.common.ratelimit.RateLimitInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers {@link RateLimitInterceptor} to enforce per-user rate limiting
 * on {@code /api/ai/**} endpoints.
 * <p>
 * The health-check endpoint ({@code /api/ai/health}) is explicitly excluded.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebMvcConfig(RateLimitInterceptor rateLimitInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // TODO: 上线后启用速率限制
        // registry.addInterceptor(rateLimitInterceptor)
        //         .addPathPatterns("/api/ai/**")
        //         .excludePathPatterns("/api/ai/health", "/api/ai/sessions/**");
    }
}
